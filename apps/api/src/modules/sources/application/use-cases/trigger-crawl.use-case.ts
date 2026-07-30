import {
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SourceRepository } from '../../infrastructure/source.repository';

@Injectable()
export class TriggerCrawlUseCase {
  // We'll track manual trigger ratelimits in memory for MVP,
  // or Redis if we have it easily accessible. Since this is just MVP,
  // simple map is fine, or we can use Redis directly if injected.
  private rateLimits = new Map<string, number>();

  constructor(
    private readonly sourceRepository: SourceRepository,
    @InjectQueue('crawl-queue') private readonly crawlQueue: Queue,
  ) {}

  async execute(id: string): Promise<{ jobId: string }> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    const now = Date.now();
    const lastTrigger = this.rateLimits.get(id) || 0;

    // 5-min rate limit per source (300000ms)
    if (now - lastTrigger < 300000) {
      throw new HttpException(
        'Rate limit exceeded. Please wait 5 minutes between manual crawls.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.rateLimits.set(id, now);

    const job = await this.crawlQueue.add(
      'crawl',
      { sourceId: id, trigger: 'MANUAL' },
      { removeOnComplete: 100, removeOnFail: 500 },
    );

    return { jobId: job.id as string };
  }
}
