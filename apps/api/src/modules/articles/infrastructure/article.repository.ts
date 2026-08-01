import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ArticleStatus, Article } from '@prisma/client';

@Injectable()
export class ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(params: {
    skip?: number;
    take?: number;
    sourceId?: string;
    status?: ArticleStatus;
  }) {
    const { skip = 0, take = 20, sourceId, status } = params;
    const where: any = {};
    if (sourceId) where.sourceId = sourceId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: 'desc' },
        include: { source: { select: { name: true } } },
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total };
  }

  async search(query: string, take = 20) {
    // PostgreSQL Full Text Search
    // to_tsquery('english', 'search_term')
    const results = await this.prisma.$queryRaw<Article[]>`
      SELECT * FROM "articles"
      WHERE "status" != 'SKIPPED'
      AND to_tsvector('english', title || ' ' || coalesce(raw_text, '')) @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || coalesce(raw_text, '')), plainto_tsquery('english', ${query})) DESC
      LIMIT ${take}
    `;
    return results;
  }

  async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { source: true, analysis: true },
    });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }

  async updateStatus(id: string, status: ArticleStatus) {
    return this.prisma.article.update({
      where: { id },
      data: { status },
    });
  }
}
