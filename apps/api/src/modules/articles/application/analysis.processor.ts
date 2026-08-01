import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PromptService } from '../../prompts/infrastructure/prompt.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { DomainEvents } from '@gcc-quest/shared-types';
import { sanitizeForPrompt } from '../../../common/utils/prompt-sanitizer';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import { z } from 'zod';

const analysisSchema = z.object({
  summary: z.string().describe('A concise 3-sentence summary of the article'),
  sentiment: z
    .string()
    .describe('Overall sentiment (POSITIVE, NEGATIVE, NEUTRAL)'),
  gccCategory: z
    .string()
    .describe(
      'Category of GCC news (e.g. Expansion, Hiring, Tech Innovation, Policy)',
    ),
  entities: z.object({
    companies: z.array(z.string()),
    locations: z.array(z.string()),
    technologies: z.array(z.string()),
  }),
  impactScore: z
    .number()
    .min(1)
    .max(10)
    .describe('Business impact score from 1 to 10'),
});

/**
 * Processes article analysis jobs from the BullMQ analysis-queue.
 *
 * Previously used @OnEvent(ARTICLE_DISCOVERED) which had a race condition:
 * the event could fire before the DB write for the article was committed.
 * Using a BullMQ queue job guarantees the article exists in the DB before
 * this processor runs, because the job is enqueued AFTER prisma.article.create()
 * returns in DiscoveryWorker.
 */
@Injectable()
@Processor(QUEUES.ANALYSIS)
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<{ articleId: string }>): Promise<void> {
    const { articleId } = job.data;
    this.logger.log(`Processing analysis job for article ${articleId}`);

    try {
      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        include: { source: true },
      });

      if (!article || !article.rawText) {
        this.logger.warn(`Article ${articleId} not found or has no rawText`);
        return;
      }

      // 1. Truncate + sanitize text to defend against prompt injection (CRIT-05)
      const maxChars = 3000 * 4; // roughly 3000 tokens
      const safeTitle = sanitizeForPrompt(article.title, 500);
      const safeText = sanitizeForPrompt(article.rawText, maxChars);

      // 2. Get prompt
      const promptVersion = this.promptService.getActive('article-analysis');
      const renderedPrompt = this.promptService.render(promptVersion, {
        title: safeTitle,
        articleText: safeText,
        trustScore: article.source.trustScore,
        gccTaxonomy:
          'Expansion, Hiring, Strategy, Technology, Real Estate, Policy',
      });

      // 3. Analyze via LLM with Observability
      const analysisResult = await this.observability.trackRun(
        {
          runType: 'article-analysis',
          promptKey: 'article-analysis',
          promptVersion: promptVersion.version,
          model: 'gemini-3.5-flash-lite',
          contextId: article.id,
        },
        () => this.llm.generateStructured(renderedPrompt, analysisSchema),
      );

      // 4. Save Analysis to DB
      await this.prisma.articleAnalysis.upsert({
        where: { articleId: article.id },
        update: {
          summary: analysisResult.summary,
          sentiment: analysisResult.sentiment,
          gccCategory: analysisResult.gccCategory,
          entities: analysisResult.entities,
          impactScore: analysisResult.impactScore,
          promptKey: 'article-analysis',
          promptVersion: promptVersion.version,
          reanalysisCount: { increment: 1 },
        },
        create: {
          articleId: article.id,
          summary: analysisResult.summary,
          sentiment: analysisResult.sentiment,
          gccCategory: analysisResult.gccCategory,
          entities: analysisResult.entities,
          impactScore: analysisResult.impactScore,
          promptKey: 'article-analysis',
          promptVersion: promptVersion.version,
        },
      });

      // 5. Update Article Status
      await this.prisma.article.update({
        where: { id: article.id },
        data: { status: 'ANALYZED' },
      });

      // 6. Emit domain event for downstream processors (EmbeddingProcessor, ContentGenerationProcessor)
      this.eventEmitter.emit(DomainEvents.ARTICLE_ANALYZED, {
        articleId: article.id,
        sourceId: article.sourceId,
      });
      this.logger.log(`Analysis completed for article ${article.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to analyze article ${articleId}: ${error.message}`,
        error.stack,
      );
      // Re-throw so BullMQ can retry the job according to its retry policy
      throw error;
    }
  }
}
