import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ContentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftWithVersions(data: {
    articleId?: string;
    clusterId?: string;
    trendId?: string;
    brandVoiceId?: string;
    targetPlatform: string;
    versions: string[];
    promptKey?: string;
    promptVersion?: string;
  }) {
    const validVersions = (data.versions || []).filter(
      (v) => v && v.trim().length > 0,
    );
    if (validVersions.length === 0) {
      throw new Error(
        'Cannot create a ContentDraft without at least one valid version.',
      );
    }

    return this.prisma.contentDraft.create({
      data: {
        articleId: data.articleId,
        clusterId: data.clusterId,
        trendId: data.trendId,
        brandVoiceId: data.brandVoiceId,
        targetPlatform: data.targetPlatform,
        currentVersion: 1, // Start with version 1 which will be the first one
        versions: {
          create: validVersions.map((content, idx) => ({
            versionNumber: idx + 1,
            content,
            promptKey: data.promptKey,
            promptVersion: data.promptVersion,
            generatedBy: 'AI',
          })),
        },
      },
      include: { versions: true },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    status?: any;
    articleId?: string;
  }) {
    const { skip = 0, take = 20, status, articleId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (articleId) where.articleId = articleId;

    return this.prisma.contentDraft.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        article: {
          select: { title: true, source: { select: { name: true } } },
        },
        cluster: {
          select: {
            theme: true,
            articles: { select: { source: { select: { name: true } } } },
          },
        },
        trend: {
          select: { name: true },
        },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });
  }

  async findById(id: string) {
    const draft = await this.prisma.contentDraft.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        article: { include: { analysis: true } },
        cluster: {
          include: { articles: { include: { analysis: true, source: true } } },
        },
      },
    });
    if (!draft) throw new NotFoundException(`Draft ${id} not found`);
    return draft;
  }

  async updateStatus(id: string, status: any) {
    return this.prisma.contentDraft.update({
      where: { id },
      data: { status },
    });
  }

  async addVersion(draftId: string, content: string, generatedBy = 'USER') {
    const draft = await this.findById(draftId);
    const nextVersion = (draft.versions[0]?.versionNumber || 0) + 1;

    return this.prisma.$transaction(async (tx: any) => {
      await tx.contentVersion.create({
        data: {
          draftId,
          versionNumber: nextVersion,
          content,
          generatedBy,
        },
      });

      return tx.contentDraft.update({
        where: { id: draftId },
        data: { currentVersion: nextVersion },
        include: { versions: true },
      });
    });
  }
}
