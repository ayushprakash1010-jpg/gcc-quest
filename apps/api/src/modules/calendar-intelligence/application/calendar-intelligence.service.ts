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

    // Load upcoming scheduled posts for the next 14 days
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    const upcoming = await this.prisma.scheduledPost.findMany({
      where: {
        scheduledFor: { gte: now, lte: twoWeeks },
        status: { in: ['QUEUED', 'PUBLISHED'] },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Preferred posting hours spread across the day (e.g. 9am, 1pm, 5pm)
    // These are dynamically generated between startHour and endHour
    const windowSize = endHour - startHour;
    const preferredHours: number[] = [];
    // Divide window into 3 slots (morning, midday, afternoon)
    const numSlots = Math.min(maxPerDay, 3);
    for (let i = 0; i < numSlots; i++) {
      preferredHours.push(
        Math.round(
          startHour + (windowSize / numSlots) * i + windowSize / numSlots / 2,
        ),
      );
    }
    this.logger.log(`Preferred hours: ${preferredHours.join(', ')}`);

    const minSpacingMs = minHours * 3600 * 1000;

    // Try each day starting from today, for up to 14 days
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
      const dayCandidate = new Date(now);
      dayCandidate.setDate(dayCandidate.getDate() + dayOffset);

      const candidateDateString = dayCandidate.toISOString().split('T')[0];

      // Count how many posts are already on this day
      const postsOnDay = upcoming.filter(
        (p: any) =>
          p.scheduledFor.toISOString().split('T')[0] === candidateDateString,
      );

      if (postsOnDay.length >= maxPerDay) continue; // Day is full, try next

      // Try each preferred hour slot for this day
      for (const hour of preferredHours) {
        const candidate = new Date(dayCandidate);
        candidate.setHours(hour, 0, 0, 0);

        // Ensure the slot is in the future
        if (candidate <= now) continue;

        // Check spacing against all existing scheduled posts
        let hasConflict = false;
        for (const p of upcoming) {
          const diffMs = Math.abs(
            p.scheduledFor.getTime() - candidate.getTime(),
          );
          if (diffMs < minSpacingMs) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          return {
            slot: candidate,
            rationale: `Chosen slot complies with ${minHours}h spacing and falls within ${startHour}:00–${endHour}:00 optimal windows.`,
          };
        }
      }
    }

    // Ultimate fallback: 3 days out at midday
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 3);
    fallback.setHours(Math.round((startHour + endHour) / 2), 0, 0, 0);
    return {
      slot: fallback,
      rationale: 'Fallback slot chosen due to high calendar density.',
    };
  }
}
