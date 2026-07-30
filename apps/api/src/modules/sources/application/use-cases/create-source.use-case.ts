import { Injectable, BadRequestException } from '@nestjs/common';
import { SourceRepository } from '../../infrastructure/source.repository';
import { CreateSourceDto } from '../dtos/create-source.dto';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { SourceEntity } from '../../domain/source.entity';
import { CrawlSchedulerService } from '../crawl-scheduler.service';

@Injectable()
export class CreateSourceUseCase {
  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly ssrfGuard: SsrfGuardService,
    private readonly crawlScheduler: CrawlSchedulerService,
  ) {}

  async execute(dto: CreateSourceDto, userId?: string): Promise<SourceEntity> {
    // 1. SSRF check
    this.ssrfGuard.assertSafeUrl(dto.url);

    // 2. We should technically check robots.txt here as well,
    // but we can assume we'll add that fully in Sprint 2B.
    // For now, it passes.

    // 3. Save
    const source = await this.sourceRepository.create(dto, userId);

    // 4. Schedule
    await this.crawlScheduler.scheduleSource(source.id, source.crawlFrequency);

    return source;
  }
}
