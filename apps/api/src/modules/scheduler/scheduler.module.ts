import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { CalendarIntelligenceModule } from '../calendar-intelligence/calendar-intelligence.module';
import { SchedulerController } from './presentation/scheduler.controller';
import { PublisherCron } from './application/publisher.cron';

@Module({
  imports: [PrismaModule, CalendarIntelligenceModule],
  controllers: [SchedulerController],
  providers: [PublisherCron],
})
export class SchedulerModule {}
