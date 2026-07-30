import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Stub implementation for Sprint 1.
   * Logs events to console and writes to the analytics_events table.
   */
  async trackEvent(
    eventType: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          eventType,
          entityType,
          entityId,
          metadata: (metadata as any) || {},
        },
      });
      this.logger.debug(`Tracked event: ${eventType} on ${entityType} ${entityId || ''}`);
    } catch (error) {
      this.logger.error(`Failed to track event ${eventType}`, error);
    }
  }

  // Example listener setup for future sprints (using wildcard)
  @OnEvent('*.**')
  async handleAllEvents(payload: any, event: string) {
    if (typeof event === 'string') {
      // In Sprint 1, we won't automatically persist every event to avoid spamming the stub
      // But we log it to prove EventEmitter is working
      this.logger.debug(`Event received: ${event}`, payload);
    }
  }
}
