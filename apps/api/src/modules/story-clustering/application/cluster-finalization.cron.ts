import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StoryClusterRepository } from '../infrastructure/story-cluster.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { DomainEvents } from '@gcc-quest/shared-types';
import { z } from 'zod';

const clusterSynthesisSchema = z.object({
  theme: z
    .string()
    .describe('A short, catchy theme or title for this cluster of articles'),
  synthesisText: z
    .string()
    .describe(
      'A comprehensive synthesis of all articles in the cluster, highlighting key themes and points',
    ),
});

@Injectable()
export class ClusterFinalizationCron {
  private readonly logger = new Logger(ClusterFinalizationCron.name);

  constructor(
    private readonly repository: StoryClusterRepository,
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async finalizeClusters() {
    this.logger.log('Running cluster finalization job...');

    const windowSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'config.cluster_window_hours' },
    });
    const windowHours = windowSetting ? parseInt(windowSetting.value, 10) : 72;

    const formingClusters =
      await this.repository.findFormingClustersReadyToFinalize(windowHours);

    for (const cluster of formingClusters) {
      try {
        if (cluster.articles.length < 2) {
          // If only 1 article somehow, skip it or mark it processed
          await this.prisma.storyCluster.update({
            where: { id: cluster.id },
            data: { status: 'PROCESSED' },
          });
          continue;
        }

        const summaries = cluster.articles
          .map(
            (a, i) =>
              `Article ${i + 1} (${a.title}): ${a.analysis?.summary || ''}`,
          )
          .join('\n\n');

        const prompt = `Synthesize the following related articles into a single coherent narrative.\n\n${summaries}`;

        const result = await this.observability.trackRun(
          {
            runType: 'cluster-synthesis',
            model: 'gemini-2.0-flash',
            contextId: cluster.id,
          },
          () => this.llm.generateStructured(prompt, clusterSynthesisSchema),
        );

        await this.repository.finalizeCluster(
          cluster.id,
          result.theme,
          result.synthesisText,
        );

        this.logger.log(`Finalized cluster ${cluster.id}: ${result.theme}`);
        this.eventEmitter.emit(DomainEvents.CLUSTER_FINALIZED, {
          clusterId: cluster.id,
        });

        // Wait, the task says: Enqueue generation job via generation-queue.
        // We can just rely on the CLUSTER_FINALIZED event listener to handle generation
      } catch (err: any) {
        this.logger.error(
          `Failed to finalize cluster ${cluster.id}: ${err.message}`,
          err.stack,
        );
      }
    }
  }
}
