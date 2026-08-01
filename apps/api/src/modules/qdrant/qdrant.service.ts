import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;
  public qdrantAvailable = false;

  constructor(private configService: ConfigService) {
    const url =
      this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({ url, apiKey });
  }

  async onModuleInit() {
    try {
      // Test connection
      await this.client.getCollections();
      this.qdrantAvailable = true;

      // Ensure collections exist
      await this.ensureCollection('articles', 3072);
      await this.ensureCollection('feedback_examples', 3072);

      this.logger.log('Qdrant initialized successfully');
    } catch (error: any) {
      this.qdrantAvailable = false;
      this.logger.warn(
        `Qdrant is unreachable. Graceful degradation active. Error: ${error.message}`,
      );
    }
  }

  private async ensureCollection(collectionName: string, size: number) {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === collectionName,
    );

    if (!exists) {
      await this.client.createCollection(collectionName, {
        vectors: {
          size,
          distance: 'Cosine',
        },
      });
      this.logger.log(`Created Qdrant collection: ${collectionName}`);
    }
  }

  async upsertPoint(
    collection: string,
    id: string,
    vector: number[],
    payload?: any,
  ) {
    if (!this.qdrantAvailable) {
      return;
    }

    try {
      await this.client.upsert(collection, {
        wait: true,
        points: [
          {
            id,
            vector,
            payload,
          },
        ],
      });
    } catch (error: any) {
      this.logger.error(
        `Error upserting point to Qdrant: ${error.message || error}`,
      );
      if (error.response && error.response.json) {
        error.response
          .json()
          .then((data: any) =>
            this.logger.error(`Qdrant details: ${JSON.stringify(data)}`),
          )
          .catch(() => {});
      } else if (error.data) {
        this.logger.error(`Qdrant details: ${JSON.stringify(error.data)}`);
      }
    }
  }

  async search(
    collection: string,
    vector: number[],
    limit = 5,
    filter?: any,
  ): Promise<any[]> {
    if (!this.qdrantAvailable) {
      return [];
    }

    try {
      const results = await this.client.search(collection, {
        vector,
        limit,
        filter,
        with_payload: true,
      });
      return results;
    } catch (error) {
      this.logger.error(`Error searching Qdrant: ${error}`);
      return [];
    }
  }

  async searchArticles(
    articleId: string,
    limit = 5,
    scoreThreshold?: number,
  ): Promise<any[]> {
    if (!this.qdrantAvailable) return [];

    try {
      const results = await this.client.recommend('articles', {
        positive: [articleId],
        limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });
      return results;
    } catch (error) {
      this.logger.error(
        `Error searching Qdrant for similar articles: ${error}`,
      );
      return [];
    }
  }
}
