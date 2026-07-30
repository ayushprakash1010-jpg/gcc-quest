import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '@gcc-quest/shared-types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StoryClusterRepository } from '../infrastructure/story-cluster.repository';
import { QdrantService } from '../../qdrant/qdrant.service';

@Injectable()
export class ClusterProcessor {
  private readonly logger = new Logger(ClusterProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StoryClusterRepository,
    private readonly qdrant: QdrantService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Listens to ARTICLE_EMBEDDED
  @OnEvent(DomainEvents.ARTICLE_EMBEDDED, { async: true })
  async handleArticleEmbedded(payload: { articleId: string }) {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'feature.story_clustering' },
      });
      if (setting && setting.value === 'false') return;

      const article = await this.prisma.article.findUnique({
        where: { id: payload.articleId },
        include: { analysis: true },
      });
      if (!article || article.clusterId) return; // Already clustered somehow

      const simSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'config.cluster_similarity' },
      });
      const similarityThreshold = simSetting
        ? parseFloat(simSetting.value)
        : 0.85;

      const windowSetting = await this.prisma.systemSetting.findUnique({
        where: { key: 'config.cluster_window_hours' },
      });
      const windowHours = windowSetting
        ? parseInt(windowSetting.value, 10)
        : 72;

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - windowHours);

      // Search Qdrant for similar articles
      const matches = await this.qdrant.searchArticles(
        payload.articleId,
        1,
        similarityThreshold,
      );

      if (matches.length > 0) {
        const matchId = matches[0].id;
        const matchedArticle = await this.prisma.article.findUnique({
          where: { id: matchId },
        });

        if (matchedArticle && matchedArticle.discoveredAt >= cutoff) {
          // If match is already in a cluster, join it
          if (matchedArticle.clusterId) {
            await this.repository.addArticle(
              matchedArticle.clusterId,
              article.id,
            );
            this.logger.log(
              `Added article ${article.id} to existing cluster ${matchedArticle.clusterId}`,
            );
          } else {
            // Create a new cluster with both
            const cluster = await this.repository.create(matchedArticle.id);
            await this.repository.addArticle(cluster.id, article.id);
            this.logger.log(
              `Created new cluster ${cluster.id} for articles ${matchedArticle.id} and ${article.id}`,
            );
          }
          this.eventEmitter.emit(DomainEvents.CLUSTER_FORMED, {
            articleId: article.id,
          });
          return;
        }
      }

      this.logger.log(`No cluster match for article ${article.id}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to process clustering for article ${payload.articleId}: ${err.message}`,
        err.stack,
      );
    }
  }
}
