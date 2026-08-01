import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { QdrantModule } from '../qdrant/qdrant.module';
import { ObservabilityModule } from '../observability/observability.module';
import { LlmModule } from '../llm/llm.module';

import { StoryClusterRepository } from './infrastructure/story-cluster.repository';
import { ClusterProcessor } from './application/cluster.processor';
import { ClusterFinalizationCron } from './application/cluster-finalization.cron';
import { StoryClustersController } from './presentation/story-clusters.controller';

@Module({
  imports: [PrismaModule, QdrantModule, ObservabilityModule, LlmModule],
  providers: [
    StoryClusterRepository,
    ClusterProcessor,
    ClusterFinalizationCron,
  ],
  controllers: [StoryClustersController],
  exports: [StoryClusterRepository],
})
export class StoryClusteringModule {}
