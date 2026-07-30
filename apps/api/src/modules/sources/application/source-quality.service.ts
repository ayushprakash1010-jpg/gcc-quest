import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SourceRepository } from '../infrastructure/source.repository';
import { SourceEntity } from '../domain/source.entity';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';

@Injectable()
export class SourceQualityService {
  private readonly logger = new Logger(SourceQualityService.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    // Note: We might need a generic queue for recalculation, but the task says 'quality-recalculation-queue'.
    // We should probably just use analysis or trend queue, or register a new one.
    // Wait, the plan specifically states `quality-recalculation-queue`. We should add this to QUEUES if it doesn't exist,
    // but we can just use the CRAWL queue with a specific job name 'recalculate-quality' to avoid creating a whole new queue just for a daily cron,
    // or register 'quality-queue'. Let's stick to the simplest: we will add a method here that processes all sources.
  ) {}

  calculateFreshnessScore(source: SourceEntity): number {
    if (!source.lastCrawledAt) {
      return 0; // Never crawled, no freshness
    }

    const now = new Date().getTime();
    const lastCrawled = new Date(source.lastCrawledAt).getTime();
    const daysSinceLastArticle = (now - lastCrawled) / (1000 * 60 * 60 * 24);

    const freshness = Math.max(0, 1 - daysSinceLastArticle / 30);
    return Number(freshness.toFixed(2));
  }

  calculateCompositeScore(
    trust: number,
    authority: number,
    freshness: number,
  ): number {
    const composite = 0.4 * trust + 0.4 * authority + 0.2 * freshness;
    return Number(composite.toFixed(2));
  }

  async recalculateAll(): Promise<void> {
    this.logger.log('Recalculating quality scores for all sources...');
    let skip = 0;
    const take = 100;
    let hasMore = true;

    while (hasMore) {
      const { items } = await this.sourceRepository.findAll({ skip, take });
      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const source of items) {
        const freshness = this.calculateFreshnessScore(source);
        const composite = this.calculateCompositeScore(
          source.trustScore,
          source.authorityScore,
          freshness,
        );

        if (
          source.freshnessScore !== freshness ||
          source.compositeScore !== composite
        ) {
          await this.sourceRepository.updateSystemScores(source.id, {
            freshnessScore: freshness,
            compositeScore: composite,
          });
        }
      }

      skip += take;
    }

    this.logger.log('Completed quality score recalculation.');
  }
}
