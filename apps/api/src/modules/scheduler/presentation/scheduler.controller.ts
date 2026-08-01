import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CalendarIntelligenceService } from '../../calendar-intelligence/application/calendar-intelligence.service';

@Controller('schedule')
export class SchedulerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendarService: CalendarIntelligenceService,
  ) {}

  @Get()
  async getScheduledPosts() {
    return this.prisma.scheduledPost.findMany({
      include: {
        draft: { include: { article: true, trend: true, cluster: true } },
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  @Post()
  async schedulePost(@Body() dto: { draftId: string; scheduledFor?: string }) {
    const draft = await this.prisma.contentDraft.findUnique({
      where: { id: dto.draftId },
    });
    if (!draft) throw new NotFoundException('Draft not found');
    if (draft.status !== 'APPROVED')
      throw new BadRequestException('Only approved drafts can be scheduled');

    let slot: Date;
    let rationale = 'User-selected manual time';
    let recommendedSlot: Date | null = null;

    if (dto.scheduledFor) {
      slot = new Date(dto.scheduledFor);
    } else {
      const rec = await this.calendarService.getRecommendedSlot(dto.draftId);
      slot = rec.slot;
      rationale = rec.rationale;
      recommendedSlot = rec.slot;
    }

    const scheduled = await this.prisma.scheduledPost.create({
      data: {
        draftId: dto.draftId,
        scheduledFor: slot,
        recommendedSlot,
        scheduleRationale: rationale,
        status: 'QUEUED',
      },
    });

    await this.prisma.contentDraft.update({
      where: { id: dto.draftId },
      data: { status: 'SCHEDULED' },
    });

    return scheduled;
  }

  @Put(':id')
  async reschedulePost(
    @Param('id') id: string,
    @Body() dto: { scheduledFor: string },
  ) {
    return this.prisma.scheduledPost.update({
      where: { id },
      data: { scheduledFor: new Date(dto.scheduledFor) },
    });
  }

  @Delete(':id')
  async cancelScheduledPost(@Param('id') id: string) {
    const scheduled = await this.prisma.scheduledPost.findUnique({
      where: { id },
    });
    if (scheduled) {
      await this.prisma.contentDraft.update({
        where: { id: scheduled.draftId },
        data: { status: 'APPROVED' }, // revert to approved
      });
      await this.prisma.scheduledPost.update({
        where: { id },
        data: { status: 'CANCELED' },
      });
    }
    return { success: true };
  }

  @Get('recommendation/:id')
  async getRecommendation(@Param('id') id: string) {
    return this.calendarService.getRecommendedSlot(id);
  }

  @Get('calendar')
  async getCalendarView() {
    const posts = await this.prisma.scheduledPost.findMany({
      where: { status: { in: ['QUEUED', 'PUBLISHED'] } },
      include: {
        draft: {
          include: {
            brandVoice: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
      },
    });

    // Group by date (YYYY-MM-DD)
    const calendar: Record<string, any[]> = {};
    posts.forEach((p: any) => {
      const date = p.scheduledFor.toISOString().split('T')[0];
      if (!calendar[date]) calendar[date] = [];
      calendar[date].push(p);
    });

    return calendar;
  }
}
