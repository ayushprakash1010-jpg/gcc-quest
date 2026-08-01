import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ClusterStatus } from '@prisma/client';

@Injectable()
export class StoryClusterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(articleId: string) {
    return this.prisma.storyCluster.create({
      data: {
        articles: {
          connect: { id: articleId },
        },
      },
    });
  }

  async addArticle(clusterId: string, articleId: string) {
    return this.prisma.storyCluster.update({
      where: { id: clusterId },
      data: {
        articleCount: { increment: 1 },
        lastArticleAt: new Date(),
        articles: { connect: { id: articleId } },
      },
    });
  }

  async findFormingClustersReadyToFinalize(hoursWindow: number) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursWindow);

    return this.prisma.storyCluster.findMany({
      where: {
        status: ClusterStatus.FORMING,
        lastArticleAt: { lt: cutoffDate },
      },
      include: {
        articles: { include: { analysis: true } },
      },
    });
  }

  async finalizeCluster(id: string, theme: string, synthesisText: string) {
    return this.prisma.storyCluster.update({
      where: { id },
      data: {
        status: ClusterStatus.READY,
        theme,
        synthesisText,
        finalizedAt: new Date(),
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    status?: any;
    theme?: string;
  }) {
    const { skip = 0, take = 20, status, theme } = params;
    const where: any = {};
    if (status) where.status = status;
    if (theme) where.theme = { contains: theme, mode: 'insensitive' };

    return this.prisma.storyCluster.findMany({
      where,
      skip,
      take,
      orderBy: { lastArticleAt: 'desc' },
      include: {
        _count: { select: { articles: true } },
      },
    });
  }

  async findById(id: string) {
    const cluster = await this.prisma.storyCluster.findUnique({
      where: { id },
      include: {
        articles: {
          include: { source: { select: { name: true } }, analysis: true },
        },
      },
    });
    if (!cluster) throw new NotFoundException(`Cluster ${id} not found`);
    return cluster;
  }
}
