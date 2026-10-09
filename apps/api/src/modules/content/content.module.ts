import { Module } from '@nestjs/common';
import { ContentRepository } from './infrastructure/content.repository';
import { ContentGenerationProcessor } from './application/content-generation.processor';
import { ClusterGenerationProcessor } from './application/cluster-generation.processor';
import { TrendGenerationProcessor } from './application/trend-generation.processor';
import { ContentController } from './presentation/content.controller';
import { OriginalContentCron } from './application/original-content.cron';

@Module({
  controllers: [ContentController],
  providers: [
    ContentRepository,
    ContentGenerationProcessor,
    ClusterGenerationProcessor,
    TrendGenerationProcessor,
    OriginalContentCron,
  ],
  exports: [ContentRepository],
})
export class ContentModule {}
