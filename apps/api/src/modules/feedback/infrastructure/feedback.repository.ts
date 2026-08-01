import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    originalText: string;
    editedText: string;
    category?: string;
    draftId?: string;
    diffSummary?: string;
  }) {
    return this.prisma.feedbackExample.create({ data });
  }

  async findMany(params: {
    category?: string;
    applied?: boolean;
    take?: number;
  }) {
    const { category, applied, take = 50 } = params;
    return this.prisma.feedbackExample.findMany({
      where: {
        category: category || undefined,
        applied: applied !== undefined ? applied : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async findById(id: string) {
    return this.prisma.feedbackExample.findUnique({ where: { id } });
  }

  async updateApplied(id: string, applied: boolean) {
    return this.prisma.feedbackExample.update({
      where: { id },
      data: { applied },
    });
  }
}
