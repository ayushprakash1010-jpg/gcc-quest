import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { EventsModule } from './infrastructure/events/events.module';
import { AuthModule } from './modules/auth/auth.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { SourcesModule } from './modules/sources/sources.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { LlmModule } from './modules/llm/llm.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { QdrantModule } from './modules/qdrant/qdrant.module';
import { BrandIntelligenceModule } from './modules/brand-intelligence/brand-intelligence.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { ContentModule } from './modules/content/content.module';
import { StoryClusteringModule } from './modules/story-clustering/story-clustering.module';
import { TrendDetectionModule } from './modules/trend-detection/trend-detection.module';
import { CalendarIntelligenceModule } from './modules/calendar-intelligence/calendar-intelligence.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    EventsModule,
    AuthModule,
    FeatureFlagsModule,
    AnalyticsModule,
    QueueModule,
    SourcesModule,
    ArticlesModule,
    LlmModule,
    PromptsModule,
    ObservabilityModule,
    QdrantModule,
    BrandIntelligenceModule,
    FeedbackModule,
    ContentModule,
    StoryClusteringModule,
    TrendDetectionModule,
    CalendarIntelligenceModule,
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
