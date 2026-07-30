import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class CalendarIntelligenceService {
  private readonly logger = new Logger(CalendarIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendedSlot(
    draftId: string,
  ): Promise<{ slot: Date; rationale: string }> {
    this.logger.log(`Calculating recommended slot for draft: ${draftId}`);

    // Load rules
    const rules = await this.prisma.calendarRule.findMany({
      where: { isActive: true },
    });
    let maxPerDay = 3;
    let minHours = 4;
    let startHour = 8;
    let endHour = 20;

    rules.forEach((r: any) => {
      const config = r.config as any;
      if (r.ruleType === 'MAX_PER_DAY' && config.max) maxPerDay = config.max;
      if (r.ruleType === 'SPACING' && config.minHours)
        minHours = config.minHours;
      if (r.ruleType === 'ALLOWED_TIMES' && config.startHour !== undefined) {
        startHour = config.startHour;
        endHour = config.endHour;
      }
    });

    // Load upcoming scheduled posts
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const upcoming = await this.prisma.scheduledPost.findMany({
      where: {
        scheduledFor: { gte: now, lte: nextWeek },
        status: { in: ['QUEUED', 'PUBLISHED'] },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Start looking for a slot tomorrow at startHour
    let candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(startHour, 0, 0, 0);

    // Iteratively try slots (every hour)
    let foundSlot = null;
    let attempts = 0;
    while (!foundSlot && attempts < 100) {
      attempts++;
      const hour = candidate.getHours();

      // Check allowed times
      if (hour < startHour || hour >= endHour) {
        candidate.setHours(candidate.getHours() + 1);
        continue;
      }

      // Check max per day
      const candidateDateString = candidate.toISOString().split('T')[0];
      const postsOnDay = upcoming.filter(
        (p: any) =>
          p.scheduledFor.toISOString().split('T')[0] === candidateDateString,
      );
      if (postsOnDay.length >= maxPerDay) {
        // Skip to next day
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(startHour, 0, 0, 0);
        continue;
      }

      // Check spacing
      const minSpacingMs = minHours * 3600 * 1000;
      let hasConflict = false;
      for (const p of upcoming) {
        const diffMs = Math.abs(p.scheduledFor.getTime() - candidate.getTime());
        if (diffMs < minSpacingMs) {
          hasConflict = true;
          break;
        }
      }

      if (hasConflict) {
        candidate.setHours(candidate.getHours() + 1);
        continue;
      }

      // Found!
      foundSlot = new Date(candidate);
    }

    if (!foundSlot) {
      foundSlot = new Date(now);
      foundSlot.setDate(foundSlot.getDate() + 3); // arbitrary fallback
      return {
        slot: foundSlot,
        rationale: 'Fallback slot chosen due to high calendar density.',
      };
    }

    return {
      slot: foundSlot,
      rationale: `Chosen slot complies with ${minHours}h spacing and falls within ${startHour}:00-${endHour}:00 optimal windows.`,
    };
  }
}
