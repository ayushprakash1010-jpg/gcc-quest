import {
  Controller,
  Get,
  Param,
  Query,
  Post,
  NotFoundException,
} from '@nestjs/common';
import { TrendDetectionService } from '../application/trend-detection.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '@gcc-quest/shared-types';

@Controller('trends')
export class TrendsController {
  constructor(
    private readonly trendService: TrendDetectionService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  async getTrends(
    @Query('type') type?: any,
    @Query('status') status?: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.prisma.trend.findMany({
      where: {
        ...(type && { type }),
        ...(status && { status }),
      },
      orderBy: { score: 'desc' },
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
    });
  }

  @Get(':id')
  async getTrend(@Param('id') id: string) {
    const trend = await this.prisma.trend.findUnique({
      where: { id },
      include: {
        trendArticles: {
          include: { article: { include: { source: true, analysis: true } } },
          orderBy: { relevance: 'desc' },
        },
      },
    });

    if (!trend) {
      throw new NotFoundException('Trend not found');
    }

    return trend;
  }

  @Post('run-detection')
  async runDetection(@Query('window') window?: string) {
    const days = window ? parseInt(window, 10) : 7;
    await this.trendService.detectTrends(days);
    return { success: true, message: `Detection ran for ${days} days window.` };
  }

  @Post(':id/generate')
  async generateTrendPost(@Param('id') id: string) {
    const trend = await this.prisma.trend.findUnique({ where: { id } });
    if (!trend) {
      throw new NotFoundException('Trend not found');
    }

    // Trigger generation via event
    this.eventEmitter.emit(DomainEvents.TREND_DETECTED, { trendId: trend.id });

    // Update status to PROCESSED
    await this.prisma.trend.update({
      where: { id },
      data: { status: 'PROCESSED' },
    });

    return { success: true, message: 'Generation triggered' };
  }
}
