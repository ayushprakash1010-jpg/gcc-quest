import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SourcesController } from './presentation/sources.controller';
import { CreateSourceUseCase } from './application/use-cases/create-source.use-case';
import { UpdateSourceUseCase } from './application/use-cases/update-source.use-case';
import { DeleteSourceUseCase } from './application/use-cases/delete-source.use-case';
import { TriggerCrawlUseCase } from './application/use-cases/trigger-crawl.use-case';
import { SourceRepository } from './infrastructure/source.repository';
import { SsrfGuardService } from '../../common/security/ssrf-guard.service';
import { CrawlSchedulerService } from './application/crawl-scheduler.service';
import { SourceQualityService } from './application/source-quality.service';
import { DiscoveryWorker } from './application/discovery.worker';
import { DeduplicationEngine } from './application/deduplication.engine';
import { AdapterFactory } from './infrastructure/adapters/adapter.factory';
import { RssAdapter } from './infrastructure/adapters/rss.adapter';
import { WebAdapter } from './infrastructure/adapters/web.adapter';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'crawl-queue',
    }),
  ],
  controllers: [SourcesController],
  providers: [
    CreateSourceUseCase,
    UpdateSourceUseCase,
    DeleteSourceUseCase,
    TriggerCrawlUseCase,
    SourceRepository,
    SsrfGuardService,
    CrawlSchedulerService,
    SourceQualityService,
    DiscoveryWorker,
    DeduplicationEngine,
    AdapterFactory,
    RssAdapter,
    WebAdapter,
  ],
  exports: [SourceRepository],
})
export class SourcesModule {}
