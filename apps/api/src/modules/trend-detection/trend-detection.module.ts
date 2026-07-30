import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { TrendDetectionService } from './application/trend-detection.service';
import { TrendDetectionCron } from './application/trend-detection.cron';
import { TrendsController } from './presentation/trends.controller';

@Module({
  imports: [PrismaModule],
  providers: [TrendDetectionService, TrendDetectionCron],
  controllers: [TrendsController],
  exports: [TrendDetectionService],
})
export class TrendDetectionModule {}
