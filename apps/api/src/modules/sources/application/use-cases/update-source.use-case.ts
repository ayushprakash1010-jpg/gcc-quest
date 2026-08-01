import { Injectable, NotFoundException } from '@nestjs/common';
import { SourceRepository } from '../../infrastructure/source.repository';
import { UpdateSourceDto } from '../dtos/update-source.dto';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { SourceEntity } from '../../domain/source.entity';
import { CrawlSchedulerService } from '../crawl-scheduler.service';

@Injectable()
export class UpdateSourceUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly ssrfGuard: SsrfGuardService,
    private readonly crawlScheduler: CrawlSchedulerService,
  ) {}

  async execute(id: string, dto: UpdateSourceDto): Promise<SourceEntity> {
    const existing = await this.sourceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    if (dto.url && dto.url !== existing.url) {
      this.ssrfGuard.assertSafeUrl(dto.url);
    }

    const updated = await this.sourceRepository.update(id, dto);

    // If frequency or status changed, we resync schedule
    if (dto.crawlFrequency && dto.crawlFrequency !== existing.crawlFrequency) {
      await this.crawlScheduler.unscheduleSource(id);
      await this.crawlScheduler.scheduleSource(id, dto.crawlFrequency);
    } else if (dto.status && dto.status !== existing.status) {
      if (dto.status !== 'ACTIVE') {
        await this.crawlScheduler.unscheduleSource(id);
      } else {
        await this.crawlScheduler.scheduleSource(id, updated.crawlFrequency);
      }
    }

    return updated;
  }
}
