import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async trackEvent(
    eventType: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
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
    } catch (error) {
      this.logger.error(`Failed to track event ${eventType}`, error);
    }
  }

  @OnEvent('*.**')
  async handleAllEvents(payload: any, event: string) {
    if (typeof event === 'string') {
      this.logger.debug(`Event received: ${event}`, payload);
    }
  }

  // --- SPRINT 10: REAL AGGREGATIONS ---

  private getDateFilter(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  async getOverview(days: number) {
    const after = this.getDateFilter(days);

    const [
      totalArticles,
      postsGenerated,
      approvedCount,
      sourcesActive,
      postsScheduled,
    ] = await Promise.all([
      this.prisma.article.count({ where: { discoveredAt: { gte: after } } }),
      this.prisma.contentDraft.count({ where: { createdAt: { gte: after } } }),
      this.prisma.contentDraft.count({
        where: {
          createdAt: { gte: after },
          status: { in: ['APPROVED', 'SCHEDULED', 'PUBLISHED'] },
        },
      }),
      this.prisma.source.count({ where: { status: 'ACTIVE' } }),
      this.prisma.scheduledPost.count({
        where: { scheduledFor: { gte: after }, status: 'QUEUED' },
      }),
    ]);

    const approvalRate =
      postsGenerated > 0 ? (approvedCount / postsGenerated) * 100 : 0;

    return {
      totalArticles,
      postsGenerated,
      approvalRate,
      sourcesActive,
      postsScheduled,
    };
  }

  async getFunnel(days: number) {
    const after = this.getDateFilter(days);

    const [discovered, analyzed, generated, approved, published] =
      await Promise.all([
        this.prisma.article.count({ where: { discoveredAt: { gte: after } } }),
        this.prisma.articleAnalysis.count({
          where: { createdAt: { gte: after } },
        }),
        this.prisma.contentDraft.count({
          where: { createdAt: { gte: after } },
        }),
        this.prisma.contentDraft.count({
          where: {
            createdAt: { gte: after },
            status: { in: ['APPROVED', 'SCHEDULED', 'PUBLISHED'] },
          },
        }),
        this.prisma.scheduledPost.count({
          where: { createdAt: { gte: after }, status: 'PUBLISHED' },
        }),
      ]);

    return [
      { step: 'Discovered', count: discovered },
      { step: 'Analyzed', count: analyzed },
      { step: 'Generated', count: generated },
      { step: 'Approved', count: approved },
      { step: 'Published', count: published },
    ];
  }

  async getTimeSeries(days: number) {
    const after = this.getDateFilter(days);

    // Using Prisma grouping to get counts by day
    const articles = await this.prisma.article.findMany({
      where: { discoveredAt: { gte: after } },
      select: { discoveredAt: true },
    });

    const seriesMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      seriesMap.set(dateStr, 0);
    }

    for (const a of articles) {
      const dateStr = a.discoveredAt.toISOString().split('T')[0];
      if (seriesMap.has(dateStr)) {
        seriesMap.set(dateStr, seriesMap.get(dateStr)! + 1);
      }
    }

    return Array.from(seriesMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getTopEntities(type: 'COMPANY' | 'LOCATION', days: number) {
    const after = this.getDateFilter(days);
    const analyses = await this.prisma.articleAnalysis.findMany({
      where: { createdAt: { gte: after } },
      select: { entities: true },
    });

    const counts = new Map<string, number>();
    for (const a of analyses) {
      const entitiesObj: any = a.entities || {};
      const list =
        type === 'COMPANY' ? entitiesObj.companies : entitiesObj.locations;
      if (Array.isArray(list)) {
        for (const item of list) {
          counts.set(item, (counts.get(item) || 0) + 1);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getCategories(days: number) {
    const after = this.getDateFilter(days);
    const result = await this.prisma.articleAnalysis.groupBy({
      by: ['gccCategory'],
      _count: { gccCategory: true },
      where: { createdAt: { gte: after } },
    });
    return result
      .map((r) => ({ category: r.gccCategory, count: r._count.gccCategory }))
      .sort((a, b) => b.count - a.count);
  }

  async getSources(days: number) {
    const after = this.getDateFilter(days);
    const sources = await this.prisma.source.findMany({
      include: {
        articles: {
          where: { discoveredAt: { gte: after } },
          select: { id: true },
        },
      },
    });

    return sources
      .map((s) => ({
        id: s.id,
        name: s.name,
        compositeScore: s.compositeScore,
        articlesCount: s.articles.length,
        lastCrawled: s.lastCrawledAt,
        status: s.status,
      }))
      .sort((a, b) => b.articlesCount - a.articlesCount);
  }

  async getAiUsage(days: number) {
    const after = this.getDateFilter(days);
    const runs = await this.prisma.agentRun.findMany({
      where: { startedAt: { gte: after } },
      select: {
        startedAt: true,
        tokensInput: true,
        tokensOutput: true,
        costUsd: true,
        model: true,
      },
    });

    let totalCost = 0;
    let totalTokens = 0;
    const modelBreakdown = new Map<string, number>();
    const dailyTokens = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyTokens.set(d.toISOString().split('T')[0], 0);
    }

    for (const r of runs) {
      totalCost += r.costUsd;
      const tokens = r.tokensInput + r.tokensOutput;
      totalTokens += tokens;

      modelBreakdown.set(r.model, (modelBreakdown.get(r.model) || 0) + tokens);

      const dateStr = r.startedAt.toISOString().split('T')[0];
      if (dailyTokens.has(dateStr)) {
        dailyTokens.set(dateStr, dailyTokens.get(dateStr)! + tokens);
      }
    }

    return {
      totalCost,
      totalTokens,
      modelBreakdown: Array.from(modelBreakdown.entries()).map(
        ([model, tokens]) => ({ model, tokens }),
      ),
      dailyTokens: Array.from(dailyTokens.entries())
        .map(([date, tokens]) => ({ date, tokens }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getAiLatency(days: number) {
    const after = this.getDateFilter(days);
    const runs = await this.prisma.agentRun.findMany({
      where: { startedAt: { gte: after }, latencyMs: { not: null } },
      select: { runType: true, latencyMs: true },
    });

    const byType = new Map<string, number[]>();
    for (const r of runs) {
      if (!byType.has(r.runType)) byType.set(r.runType, []);
      byType.get(r.runType)!.push(r.latencyMs!);
    }

    const res: any[] = [];
    for (const [type, latencies] of byType.entries()) {
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
      const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
      res.push({ runType: type, p50, p95, p99, count: latencies.length });
    }

    return res;
  }

  async getPromptPerformance(days: number) {
    const after = this.getDateFilter(days);
    const result = await this.prisma.agentRun.groupBy({
      by: ['promptKey', 'promptVersion', 'success'],
      _count: { success: true },
      _avg: { latencyMs: true },
      where: { startedAt: { gte: after }, promptKey: { not: null } },
    });

    const performanceMap = new Map<string, any>();
    for (const r of result) {
      const key = `${r.promptKey}@${r.promptVersion}`;
      if (!performanceMap.has(key)) {
        performanceMap.set(key, {
          promptKey: r.promptKey,
          version: r.promptVersion,
          success: 0,
          failed: 0,
          latencies: [],
        });
      }
      const val = performanceMap.get(key)!;
      if (r.success) {
        val.success += r._count.success;
      } else {
        val.failed += r._count.success;
      }
      if (r._avg.latencyMs) {
        val.latencies.push(r._avg.latencyMs);
      }
    }

    return Array.from(performanceMap.values())
      .map((v) => {
        const total = v.success + v.failed;
        const successRate = total > 0 ? (v.success / total) * 100 : 0;
        const avgLatency =
          v.latencies.length > 0
            ? v.latencies.reduce((a: number, b: number) => a + b, 0) /
              v.latencies.length
            : 0;
        return {
          promptKey: v.promptKey,
          version: v.version,
          totalRuns: total,
          successRate,
          avgLatency,
        };
      })
      .sort((a, b) => b.totalRuns - a.totalRuns);
  }
}
