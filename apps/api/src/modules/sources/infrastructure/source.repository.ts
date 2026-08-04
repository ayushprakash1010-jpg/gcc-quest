import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { SourceEntity } from '../domain/source.entity';
import { CreateSourceDto } from '../application/dtos/create-source.dto';
import { UpdateSourceDto } from '../application/dtos/update-source.dto';
import { SourceStatus } from '@prisma/client';

@Injectable()
export class SourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSourceDto,
    createdBy?: string,
  ): Promise<SourceEntity> {
    const data: any = {
      ...dto,
      tags: dto.tags || [],
    };
    if (createdBy) {
      data.createdBy = createdBy;
    }

    const source = await this.prisma.source.create({
      data,
    });
    return new SourceEntity(source as any);
  }

  async findById(id: string): Promise<SourceEntity | null> {
    const source = await this.prisma.source.findUnique({
      where: { id },
    });
    if (!source) return null;
    return new SourceEntity(source as any);
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: SourceStatus;
    category?: any;
  }): Promise<{ items: SourceEntity[]; total: number }> {
    const { skip = 0, take = 50, status, category } = params;

    const where: any = {};
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'DISABLED' }; // Hide soft-deleted sources by default
    }
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      this.prisma.source.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.source.count({ where }),
    ]);

    return {
      items: items.map((item: any) => new SourceEntity(item as any)),
      total,
    };
  }

  async update(id: string, dto: UpdateSourceDto): Promise<SourceEntity> {
    try {
      const source = await this.prisma.source.update({
        where: { id },
        data: dto,
      });
      return new SourceEntity(source as any);
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new NotFoundException(`Source with id ${id} not found`);
      }
      throw e;
    }
  }

  async updateSystemScores(
    id: string,
    scores: {
      trustScore?: number;
      authorityScore?: number;
      freshnessScore?: number;
      compositeScore?: number;
    },
  ): Promise<SourceEntity> {
    const source = await this.prisma.source.update({
      where: { id },
      data: scores,
    });
    return new SourceEntity(source as any);
  }

  async findQualityReport(): Promise<SourceEntity[]> {
    const items = await this.prisma.source.findMany({
      orderBy: { compositeScore: 'desc' },
    });
    return items.map((item: any) => new SourceEntity(item as any));
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.source.update({
        where: { id },
        data: { status: SourceStatus.DISABLED },
      });
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new NotFoundException(`Source with id ${id} not found`);
      }
      throw e;
    }
  }

  async incrementArticleCount(id: string, incrementBy: number): Promise<void> {
    await this.prisma.source.update({
      where: { id },
      data: {
        totalArticles: {
          increment: incrementBy,
        },
      },
    });
  }

  async recordCrawlHistory(data: {
    sourceId: string;
    articlesFound: number;
    articlesNew: number;
    articlesDedup: number;
    errors: number;
    durationMs: number;
    trigger: 'SCHEDULED' | 'MANUAL';
  }): Promise<void> {
    await this.prisma.sourceCrawlHistory.create({
      data: {
        sourceId: data.sourceId,
        completedAt: new Date(),
        articlesFound: data.articlesFound,
        articlesNew: data.articlesNew,
        articlesDedup: data.articlesDedup,
        errors: data.errors,
        durationMs: data.durationMs,
        trigger: data.trigger,
      },
    });
  }
}
