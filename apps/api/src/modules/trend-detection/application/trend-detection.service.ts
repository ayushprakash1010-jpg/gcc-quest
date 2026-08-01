import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '@gcc-quest/shared-types';

@Injectable()
export class TrendDetectionService {
  private readonly logger = new Logger(TrendDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async detectTrends(windowDays = 7) {
    this.logger.log(`Starting trend detection for window: ${windowDays} days`);
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - windowDays);

    // HIGH-05: Added take + orderBy to prevent OOM at scale (was unbounded findMany).
    // Selects the 500 highest-impact recent articles — correct for trend detection.
    // At current data volumes this cap is never hit; it's a safety net for production scale.
    const articles = await this.prisma.article.findMany({
      where: {
        publishedAt: { gte: dateLimit },
        analysis: { isNot: null },
      },
      include: {
        analysis: true,
        source: true,
      },
      take: 500,
      orderBy: [{ analysis: { impactScore: 'desc' } }, { publishedAt: 'desc' }],
    });

    if (!articles.length) return;

    // Calculate score for each article: sourceCompositeScore * businessImpact * recencyDecay
    const scoredArticles = articles.map((article: any) => {
      const daysOld =
        (new Date().getTime() -
          (article.publishedAt?.getTime() || article.discoveredAt.getTime())) /
        (1000 * 3600 * 24);
      const recencyDecayFactor = Math.max(
        0,
        (windowDays - daysOld) / windowDays,
      );
      const score =
        article.source.compositeScore *
        (article.analysis?.impactScore || 0) *
        recencyDecayFactor;

      return { ...article, trendScore: score };
    });

    const techMap = new Map<string, { score: number; articles: any[] }>();
    const locMap = new Map<string, { score: number; articles: any[] }>();
    const catMap = new Map<string, { score: number; articles: any[] }>();

    scoredArticles.forEach((article: any) => {
      if (!article.analysis) return;
      const entities = article.analysis.entities as any;
      const score = article.trendScore;

      // Category
      if (article.analysis.gccCategory) {
        const cat = article.analysis.gccCategory;
        if (!catMap.has(cat)) catMap.set(cat, { score: 0, articles: [] });
        const val = catMap.get(cat)!;
        val.score += score;
        val.articles.push(article);
      }

      // Tech
      if (entities?.technologies && Array.isArray(entities.technologies)) {
        entities.technologies.forEach((tech: string) => {
          if (!techMap.has(tech)) techMap.set(tech, { score: 0, articles: [] });
          const val = techMap.get(tech)!;
          val.score += score;
          val.articles.push(article);
        });
      }

      // Location
      if (entities?.locations && Array.isArray(entities.locations)) {
        entities.locations.forEach((loc: string) => {
          if (!locMap.has(loc)) locMap.set(loc, { score: 0, articles: [] });
          const val = locMap.get(loc)!;
          val.score += score;
          val.articles.push(article);
        });
      }
    });

    // Check system threshold setting
    const thresholdSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'config.trend_score_threshold' },
    });
    const threshold = thresholdSetting
      ? parseFloat(thresholdSetting.value)
      : 15;

    await this.processMap(techMap, 'TECHNOLOGY', threshold);
    await this.processMap(locMap, 'LOCATION', threshold);
    await this.processMap(catMap, 'CATEGORY', threshold);
  }

  private async processMap(
    map: Map<string, { score: number; articles: any[] }>,
    type: 'TECHNOLOGY' | 'LOCATION' | 'CATEGORY',
    threshold: number,
  ) {
    for (const [name, data] of map.entries()) {
      if (data.score >= threshold) {
        // Trend detected!
        // Check if already exists in active/DETECTED state
        let trend = await this.prisma.trend.findFirst({
          where: { name, type, status: 'DETECTED' },
        });

        if (!trend) {
          trend = await this.prisma.trend.create({
            data: {
              name,
              type,
              score: data.score,
              articleCount: data.articles.length,
            },
          });
          this.logger.log(
            `New ${type} trend detected: ${name} (Score: ${data.score})`,
          );
        } else {
          // Update score and count
          trend = await this.prisma.trend.update({
            where: { id: trend.id },
            data: {
              score: data.score,
              articleCount: data.articles.length,
            },
          });
        }

        // Link articles
        for (const article of data.articles) {
          await this.prisma.trendArticle.upsert({
            where: {
              trendId_articleId: {
                trendId: trend.id,
                articleId: article.id,
              },
            },
            create: {
              trendId: trend.id,
              articleId: article.id,
              relevance: article.trendScore,
            },
            update: {
              relevance: article.trendScore,
            },
          });
        }

        // Emit Event
        this.eventEmitter.emit(DomainEvents.TREND_DETECTED, {
          trendId: trend.id,
        });
      }
    }
  }
}
