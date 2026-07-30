import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PromptService } from '../../prompts/infrastructure/prompt.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { DomainEvents } from '@gcc-quest/shared-types';
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

@Injectable()
export class AnalysisProcessor {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly featureFlags: FeatureFlagsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEvents.ARTICLE_DISCOVERED)
  async handleArticleDiscovered(payload: {
    articleId: string;
    sourceId: string;
  }) {
    this.logger.log(
      `Received ARTICLE_DISCOVERED for article ${payload.articleId}`,
    );

    try {
      const article = await this.prisma.article.findUnique({
        where: { id: payload.articleId },
        include: { source: true },
      });

      if (!article || !article.rawText) {
        this.logger.warn(
          `Article ${payload.articleId} not found or has no rawText`,
        );
        return;
      }

      // 1. Check feature flag (if auto-generation is off, we still analyze, maybe skip generation later)
      // Actually we just analyze here regardless.

      // 2. Truncate text (mocking max tokens config)
      const maxChars = 3000 * 4; // roughly 3000 tokens
      const textToAnalyze = article.rawText.substring(0, maxChars);

      // 3. Get prompt
      const promptVersion = this.promptService.getActive('article-analysis');
      const renderedPrompt = this.promptService.render(promptVersion, {
        title: article.title,
        articleText: textToAnalyze,
        trustScore: article.source.trustScore,
        gccTaxonomy:
          'Expansion, Hiring, Strategy, Technology, Real Estate, Policy',
      });

      // 4. Analyze via LLM with Observability
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

      // 5. Save Analysis to DB
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

      // 6. Update Article Status
      await this.prisma.article.update({
        where: { id: article.id },
        data: { status: 'ANALYZED' },
      });

      // 7. Track Event (mocking AnalyticsService for now, emitting domain event is enough)
      this.eventEmitter.emit(DomainEvents.ARTICLE_ANALYZED, {
        articleId: article.id,
        sourceId: article.sourceId,
      });
      this.logger.log(`Analysis completed for article ${article.id}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to analyze article ${payload.articleId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
