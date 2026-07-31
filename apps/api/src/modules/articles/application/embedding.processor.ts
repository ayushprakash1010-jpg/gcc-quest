import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QdrantService } from '../../qdrant/qdrant.service';
import { ObservabilityService } from '../../observability/observability.service';
import { GeminiProvider } from '../../llm/providers/gemini.provider';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { DomainEvents } from '@gcc-quest/shared-types';

@Injectable()
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qdrant: QdrantService,
    private readonly observability: ObservabilityService,
    private readonly llm: GeminiProvider,
    private readonly featureFlags: FeatureFlagsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(DomainEvents.ARTICLE_ANALYZED)
  async handleArticleAnalyzed(payload: {
    articleId: string;
    sourceId: string;
  }) {
    this.logger.log(
      `Received ARTICLE_ANALYZED for article ${payload.articleId}`,
    );

    try {
      const article = await this.prisma.article.findUnique({
        where: { id: payload.articleId },
        include: { analysis: true, source: true },
      });

      if (!article || !article.analysis) {
        this.logger.warn(`Article ${payload.articleId} or analysis not found`);
        return;
      }

      // Generate text to embed
      const companies = (article.analysis.entities as any)?.companies || [];
      const locations = (article.analysis.entities as any)?.locations || [];
      const textToEmbed = `${article.title} ${article.analysis.summary} ${companies.join(' ')}`;

      // Embed via LLM
      const vector = await this.observability.trackRun(
        {
          runType: 'embedding',
          model: 'gemini-embedding-001',
          contextId: article.id,
        },
        () => this.llm.embed(textToEmbed),
      );

      // Check semantic duplicate if feature is enabled
      const dedupEnabled = await this.featureFlags.isEnabled(
        'ENABLE_SEMANTIC_DEDUP',
      );
      let isDuplicate = false;

      if (dedupEnabled && this.qdrant.qdrantAvailable) {
        // Fetch threshold from DB (mocking via constant or system setting for MVP)
        const threshold = 0.92;

        // Search in Qdrant (excluding this same article if it somehow exists)
        const searchResults = await this.qdrant.search('articles', vector, 1, {
          must_not: [{ key: 'articleId', match: { value: article.id } }],
        });

        if (searchResults.length > 0 && searchResults[0].score > threshold) {
          isDuplicate = true;
          this.logger.warn(
            `Article ${article.id} is a semantic duplicate of ${searchResults[0].payload.articleId} (score: ${searchResults[0].score})`,
          );
        }
      }

      if (isDuplicate) {
        await this.prisma.article.update({
          where: { id: article.id },
          data: { status: 'SEMANTIC_DUPLICATE' },
        });
        this.eventEmitter.emit('article.semantic_duplicate_found', {
          articleId: article.id,
          originalId: 'TODO',
        }); // MVP simplification
      } else {
        // Store in Qdrant
        await this.qdrant.upsertPoint('articles', article.id, vector, {
          articleId: article.id,
          gccCategory: article.analysis.gccCategory,
          locations,
          companies,
          publishedAt: article.publishedAt
            ? article.publishedAt.toISOString()
            : null,
          sourceId: article.sourceId,
        });

        this.eventEmitter.emit(DomainEvents.ARTICLE_EMBEDDED, {
          articleId: article.id,
          sourceId: article.sourceId,
        });
        this.logger.log(`Embedding stored for article ${article.id}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to embed article ${payload.articleId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
