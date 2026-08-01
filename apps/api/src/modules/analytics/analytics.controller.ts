import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getOverview(days);
  }

  @Get('funnel')
  async getFunnel(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getFunnel(days);
  }

  @Get('time-series')
  async getTimeSeries(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getTimeSeries(days);
  }

  @Get('top-companies')
  async getTopCompanies(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getTopEntities('COMPANY', days);
  }

  @Get('top-cities')
  async getTopCities(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getTopEntities('LOCATION', days);
  }

  @Get('categories')
  async getCategories(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getCategories(days);
  }

  @Get('sources')
  async getSources(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getSources(days);
  }

  @Get('ai-usage')
  async getAiUsage(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getAiUsage(days);
  }

  @Get('ai-latency')
  async getAiLatency(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getAiLatency(days);
  }

  @Get('prompt-performance')
  async getPromptPerformance(@Query('period') period?: string) {
    const days = this.parsePeriod(period);
    return this.analyticsService.getPromptPerformance(days);
  }

  private parsePeriod(period?: string): number {
    if (!period) return 30; // default to 30 days
    const match = period.match(/^(\d+)d$/);
    if (match) return parseInt(match[1], 10);
    return 30;
  }
}
