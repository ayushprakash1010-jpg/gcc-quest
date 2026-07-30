import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TrendDetectionService } from './trend-detection.service';

@Injectable()
export class TrendDetectionCron {
  private readonly logger = new Logger(TrendDetectionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trendService: TrendDetectionService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Running daily trend detection cron job');

    // Check feature flag
    const flag = await this.prisma.systemSetting.findUnique({
      where: { key: 'feature.trend_detection' },
    });
    if (flag && flag.value === 'false') {
      this.logger.log('Trend detection feature is disabled.');
      return;
    }

    try {
      // Run detection for 7d window (default)
      await this.trendService.detectTrends(7);

      // We can also run for 14d, 30d if needed
      // await this.trendService.detectTrends(14);
      // await this.trendService.detectTrends(30);

      this.logger.log('Daily trend detection completed.');
    } catch (error: any) {
      this.logger.error(
        `Error during trend detection: ${error.message}`,
        error.stack,
      );
    }
  }
}
