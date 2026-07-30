import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PromptService } from '../../prompts/infrastructure/prompt.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { BrandVoiceService } from '../../brand-intelligence/application/brand-voice.service';
import { FeedbackService } from '../../feedback/application/feedback.service';
import { ContentRepository } from '../infrastructure/content.repository';
import { DomainEvents } from '@gcc-quest/shared-types';
import { z } from 'zod';

const draftsSchema = z.object({
  variants: z
    .array(z.string())
    .describe('Array of exactly 2 different post drafts'),
});

@Injectable()
export class ContentGenerationProcessor {
  private readonly logger = new Logger(ContentGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly brandVoiceService: BrandVoiceService,
    private readonly feedbackService: FeedbackService,
    private readonly contentRepository: ContentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEvents.ARTICLE_ANALYZED)
  async handleArticleAnalyzed(payload: {
    articleId: string;
    sourceId: string;
  }) {
    this.logger.log(
      `Received ARTICLE_ANALYZED for generation evaluation: ${payload.articleId}`,
    );

    try {
      const article = await this.prisma.article.findUnique({
        where: { id: payload.articleId },
        include: { analysis: true },
      });

      if (!article || !article.analysis) return;

      // 1. Rule Check: threshold
      const thresholdSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'config.analysis_threshold' },
      });
      const threshold = thresholdSetting
        ? parseFloat(thresholdSetting.value)
        : 7;

      if (article.analysis.impactScore < threshold) {
        this.logger.log(
          `Article ${article.id} impact (${article.analysis.impactScore}) below threshold (${threshold}). Skipping generation.`,
        );
        return;
      }

      // Check if feature enabled
      const autoGenSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'feature.auto_generation' },
      });
      if (autoGenSetting && autoGenSetting.value === 'false') {
        this.logger.log(`Auto generation feature flag is disabled.`);
        return;
      }

      // 2. Gather Context
      const promptVersion = this.promptService.getActive(
        'writer-industry-news',
      );
      const defaultBrandVoice = await this.brandVoiceService.getDefault();
      const feedbackContext = await this.feedbackService.getFeedbackContext(
        'LINKEDIN',
        3,
      );

      const brandVoiceSection =
        this.brandVoiceService.buildPromptSection(defaultBrandVoice);

      // 3. Render
      const renderedPrompt = this.promptService.render(promptVersion, {
        summary: article.analysis.summary,
        brandVoiceConfig: brandVoiceSection,
        feedbackContext,
      });

      // 4. Generate variants
      const result = await this.observability.trackRun(
        {
          runType: 'content-generation',
          promptKey: 'writer-industry-news',
          promptVersion: promptVersion.version,
          model: 'gemini-2.0-flash',
          contextId: article.id,
        },
        () => this.llm.generateStructured(renderedPrompt, draftsSchema),
      );

      if (!result.variants || result.variants.length === 0) {
        this.logger.warn(`No variants generated for article ${article.id}`);
        return;
      }

      // 5. Save to ContentDraft
      const draft = await this.contentRepository.createDraftWithVersions({
        articleId: article.id,
        brandVoiceId: defaultBrandVoice?.id,
        targetPlatform: 'LINKEDIN',
        versions: result.variants,
        promptKey: 'writer-industry-news',
        promptVersion: promptVersion.version,
      });

      this.logger.log(
        `Generated ${result.variants.length} draft variants for article ${article.id}`,
      );
      this.eventEmitter.emit('draft.generated', { draftId: draft.id });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate content for article ${payload.articleId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
