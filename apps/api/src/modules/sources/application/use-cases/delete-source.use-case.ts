import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceRepository } from '../../infrastructure/source.repository';
import { CrawlSchedulerService } from '../crawl-scheduler.service';

@Injectable()
export class DeleteSourceUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly crawlScheduler: CrawlSchedulerService,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.sourceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    // Soft delete sets status to DISABLED
    await this.sourceRepository.delete(id);
    await this.crawlScheduler.unscheduleSource(id);
  }
}
