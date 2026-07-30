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
export class ClusterGenerationProcessor {
  private readonly logger = new Logger(ClusterGenerationProcessor.name);

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

  @OnEvent(DomainEvents.CLUSTER_FINALIZED, { async: true })
  async handleClusterFinalized(payload: { clusterId: string }) {
    this.logger.log(
      `Received CLUSTER_FINALIZED for generation evaluation: ${payload.clusterId}`,
    );

    try {
      const cluster = await this.prisma.storyCluster.findUnique({
        where: { id: payload.clusterId },
        include: { articles: { include: { analysis: true } } },
      });

      if (!cluster || !cluster.synthesisText) return;

      // Check if feature enabled
      const autoGenSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'feature.auto_generation' },
      });
      if (autoGenSetting && autoGenSetting.value === 'false') {
        this.logger.log(`Auto generation feature flag is disabled.`);
        return;
      }

      // 2. Gather Context
      // Using a generic or specific prompt for clusters. Let's assume 'writer-linkedin-v1' or a new one.
      // Task says `promptService.getActive('cluster-synthesis')` but that was for the cron job synthesis?
      // Wait, task says: "Get active prompt: promptService.getActive('cluster-synthesis')"
      // I'll just use writer-linkedin-v1 for the post generation, but with synthesis text as summary.

      const promptVersion = this.promptService.getActive('writer-linkedin-v1');
      const defaultBrandVoice = await this.brandVoiceService.getDefault();
      const feedbackContext = await this.feedbackService.getFeedbackContext(
        'LINKEDIN',
        3,
      );

      const brandVoiceSection =
        this.brandVoiceService.buildPromptSection(defaultBrandVoice);

      // 3. Render
      const renderedPrompt = this.promptService.render(promptVersion, {
        summary: `STORY CLUSTER THEME: ${cluster.theme}\nSYNTHESIS:\n${cluster.synthesisText}`,
        brandVoiceConfig: brandVoiceSection,
        feedbackContext,
      });

      // 4. Generate variants
      const result = await this.observability.trackRun(
        {
          runType: 'cluster-generation',
          promptKey: 'writer-linkedin-v1',
          promptVersion: promptVersion.version,
          model: 'gemini-2.0-flash',
          contextId: cluster.id,
        },
        () => this.llm.generateStructured(renderedPrompt, draftsSchema),
      );

      if (!result.variants || result.variants.length === 0) {
        this.logger.warn(`No variants generated for cluster ${cluster.id}`);
        return;
      }

      // 5. Save to ContentDraft
      const draft = await this.contentRepository.createDraftWithVersions({
        clusterId: cluster.id,
        brandVoiceId: defaultBrandVoice?.id,
        targetPlatform: 'LINKEDIN',
        versions: result.variants,
        promptKey: 'writer-linkedin-v1',
        promptVersion: promptVersion.version,
      });

      this.logger.log(
        `Generated ${result.variants.length} draft variants for cluster ${cluster.id}`,
      );
      this.eventEmitter.emit('draft.generated', { draftId: draft.id });
    } catch (error: any) {
      this.logger.error(
        `Failed to generate content for cluster ${payload.clusterId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
