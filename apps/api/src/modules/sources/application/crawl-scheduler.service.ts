import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SourceRepository } from '../infrastructure/source.repository';
import { SourceStatus, CrawlFrequency } from '@prisma/client';

@Injectable()
export class CrawlSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CrawlSchedulerService.name);

  constructor(
    @InjectQueue('crawl-queue') private readonly crawlQueue: Queue,
    private readonly sourceRepository: SourceRepository,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Initializing crawl scheduler...');
    await this.syncAllSchedules();
  }

  async syncAllSchedules() {
    // 1. Remove all existing repeatable jobs to avoid duplicates/stale jobs
    const repeatableJobs = await this.crawlQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.crawlQueue.removeRepeatableByKey(job.key);
    }

    // 2. Fetch all active sources
    const { items: activeSources } = await this.sourceRepository.findAll({
      status: SourceStatus.ACTIVE,
      take: 1000, // For MVP, assuming <1000 sources. In real app, we'd paginate.
    });

    // 3. Register jobs
    let registered = 0;
    for (const source of activeSources) {
      if (source.crawlFrequency === CrawlFrequency.MANUAL) continue;

      await this.scheduleSource(source.id, source.crawlFrequency);
      registered++;
    }

    this.logger.log(`Registered ${registered} scheduled crawl jobs`);
  }

  async scheduleSource(sourceId: string, frequency: CrawlFrequency) {
    if (frequency === CrawlFrequency.MANUAL) return;

    let cron = '';
    switch (frequency) {
      case CrawlFrequency.HOURLY:
        cron = '0 * * * *';
        break;
      case CrawlFrequency.DAILY:
        cron = '0 0 * * *';
        break;
      case CrawlFrequency.WEEKLY:
        cron = '0 0 * * 0';
        break;
    }

    await this.crawlQueue.add(
      'crawl',
      { sourceId, trigger: 'SCHEDULED' },
      {
        repeat: { pattern: cron },
        jobId: `crawl:scheduled:${sourceId}`,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
  }

  async unscheduleSource(sourceId: string) {
    const repeatableJobs = await this.crawlQueue.getRepeatableJobs();
    const jobsToRemove = repeatableJobs.filter(
      (job) => job.id === `crawl:scheduled:${sourceId}`,
    );

    for (const job of jobsToRemove) {
      await this.crawlQueue.removeRepeatableByKey(job.key);
    }
  }
}
