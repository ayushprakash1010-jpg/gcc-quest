import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PromptService } from '../../prompts/infrastructure/prompt.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { BrandVoiceService } from '../../brand-intelligence/application/brand-voice.service';
import { ContentRepository } from '../infrastructure/content.repository';
import { DomainEvents } from '@gcc-quest/shared-types';
import { z } from 'zod';

const draftsSchema = z.object({
  variants: z
    .array(z.string())
    .describe('Array of exactly 2 different post drafts for a macro trend'),
});

@Injectable()
export class TrendGenerationProcessor {
  private readonly logger = new Logger(TrendGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly brandVoiceService: BrandVoiceService,
    private readonly contentRepository: ContentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEvents.TREND_DETECTED, { async: true })
  async handleTrendDetected(payload: { trendId: string }) {
    this.logger.log(
      `Received TREND_DETECTED for generation: ${payload.trendId}`,
    );

    try {
      const trend = await this.prisma.trend.findUnique({
        where: { id: payload.trendId },
        include: {
          trendArticles: {
            include: { article: { include: { analysis: true } } },
            orderBy: { relevance: 'desc' },
            take: 5, // top 5 supporting articles
          },
        },
      });

      if (!trend) return;

      // Check if feature enabled
      const autoGenSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'feature.auto_generation' },
      });
      if (autoGenSetting && autoGenSetting.value === 'false') {
        this.logger.log(`Auto generation feature flag is disabled.`);
        return;
      }

      // Gather Context
      let promptVersion;
      let promptKey = 'trend-report';
      try {
        promptVersion = this.promptService.getActive('trend-report');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // Fallback to writer-industry-news if trend-report doesn't exist yet
        promptKey = 'writer-industry-news';
        promptVersion = this.promptService.getActive('writer-industry-news');
      }

      const defaultBrandVoice = await this.brandVoiceService.getDefault();
      const brandVoiceSection =
        this.brandVoiceService.buildPromptSection(defaultBrandVoice);

      // Build summary from the trend and top 5 articles
      let summary = `MACRO TREND DETECTED: ${trend.name} (${trend.type})\n\n`;
      summary += `Top supporting articles:\n`;
      trend.trendArticles.forEach((ta: any, idx: number) => {
        summary += `${idx + 1}. ${ta.article.title} - ${ta.article.analysis?.summary}\n`;
      });

      // Render
      const renderedPrompt = this.promptService.render(promptVersion, {
        summary,
        brandVoiceConfig: brandVoiceSection,
        feedbackContext:
          'Focus on macroeconomic impact and industry-wide shifts.',
      });

      // Generate variants
      const result = await this.observability.trackRun(
        {
          runType: 'trend-generation',
          promptKey: promptKey,
          promptVersion: promptVersion.version,
          model: 'gemini-3.5-flash',
          contextId: trend.id,
        },
        () => this.llm.generateStructured(renderedPrompt, draftsSchema),
      );

      if (!result.variants || result.variants.length === 0) {
        this.logger.warn(`No variants generated for trend ${trend.id}`);
        return;
      }

      // Save to ContentDraft
      const draft = await this.contentRepository.createDraftWithVersions({
        trendId: trend.id,
        brandVoiceId: defaultBrandVoice?.id,
        targetPlatform: 'LINKEDIN',
        versions: result.variants,
        promptKey: promptKey,
        promptVersion: promptVersion.version,
      });

      this.logger.log(
        `Generated ${result.variants.length} draft variants for trend ${trend.id}`,
      );
      this.eventEmitter.emit('draft.generated', { draftId: draft.id });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate content for trend ${payload.trendId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
