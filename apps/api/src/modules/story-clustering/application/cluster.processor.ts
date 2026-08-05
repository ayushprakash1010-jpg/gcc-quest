import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '@gcc-quest/shared-types';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StoryClusterRepository } from '../infrastructure/story-cluster.repository';
import { QdrantService } from '../../qdrant/qdrant.service';
import { SettingsCacheService } from '../../../common/cache/settings-cache.service';

@Injectable()
export class ClusterProcessor {
  private readonly logger = new Logger(ClusterProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: StoryClusterRepository,
    private readonly qdrant: QdrantService,
    private readonly eventEmitter: EventEmitter2,
    private readonly settingsCache: SettingsCacheService,
  ) {}

  // Listens to ARTICLE_EMBEDDED
  @OnEvent(DomainEvents.ARTICLE_EMBEDDED, { async: true })
  async handleArticleEmbedded(payload: { articleId: string }) {
    try {
      // HIGH-06: All 3 settings now served from 5-min cache instead of 3 DB queries per article
      const clusteringEnabled = await this.settingsCache.get(
        'feature.story_clustering',
        'true',
      );
      if (clusteringEnabled === 'false') return;

      const article = await this.prisma.article.findUnique({
        where: { id: payload.articleId },
        include: { analysis: true },
      });
      if (!article || article.clusterId) return; // Already clustered somehow

      const similarityThreshold = parseFloat(
        await this.settingsCache.get('config.cluster_similarity', '0.80'),
      );

      const windowHours = parseInt(
        await this.settingsCache.get('config.cluster_window_hours', '72'),
        10,
      );

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - windowHours);

      // Search Qdrant for similar articles
      const matches = await this.qdrant.searchArticles(
        payload.articleId,
        5, // Fetch top 5 candidates
        similarityThreshold,
      );

      if (matches.length > 0) {
        const matchIds = matches.map((m: any) => m.id);

        // MED-07: Fetch all candidate articles in a single batched query (fixes N+1 risk)
        const matchedArticles = await this.prisma.article.findMany({
          where: { id: { in: matchIds } },
        });

        // Find the first valid match within the time window
        const validMatch = matchedArticles.find(
          (m: any) => m.discoveredAt >= cutoff,
        );

        if (validMatch) {
          // If match is already in a cluster, join it
          if (validMatch.clusterId) {
            await this.repository.addArticle(validMatch.clusterId, article.id);
            this.logger.log(
              `Added article ${article.id} to existing cluster ${validMatch.clusterId}`,
            );
          } else {
            // Create a new cluster with both
            const cluster = await this.repository.create(validMatch.id);
            await this.repository.addArticle(cluster.id, article.id);
            this.logger.log(
              `Created new cluster ${cluster.id} for articles ${validMatch.id} and ${article.id}`,
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
