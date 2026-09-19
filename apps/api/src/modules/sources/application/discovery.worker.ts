import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SourceRepository } from '../infrastructure/source.repository';
import { AdapterFactory } from '../infrastructure/adapters/adapter.factory';
import { DeduplicationEngine } from './deduplication.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';

@Processor('crawl-queue')
export class DiscoveryWorker extends WorkerHost {
  private readonly logger = new Logger(DiscoveryWorker.name);

  constructor(
    private readonly sourceRepository: SourceRepository,
    private readonly adapterFactory: AdapterFactory,
    private readonly deduplicationEngine: DeduplicationEngine,
    @InjectQueue(QUEUES.ANALYSIS) private readonly analysisQueue: Queue,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { sourceId, trigger } = job.data;

    this.logger.log(`Starting discovery for source ${sourceId} via ${trigger}`);

    const source = await this.sourceRepository.findById(sourceId);
    if (!source || source.status !== 'ACTIVE') {
      this.logger.warn(
        `Source ${sourceId} is not active or missing, aborting crawl.`,
      );
      return;
    }

    const adapter = this.adapterFactory.getAdapter(source.type);

    const startTime = Date.now();
    let articlesFound = 0;
    let articlesNew = 0;
    let articlesDedup = 0;
    let errors = 0;

    try {
      const fetchedArticles = await adapter.fetch(source);
      articlesFound = fetchedArticles.length;

      for (const article of fetchedArticles) {
        try {
          const hash = this.deduplicationEngine.generateHash(
            article.url,
            article.title,
            article.rawText,
          );
          const isDuplicate = await this.deduplicationEngine.isDuplicate(hash);

          if (isDuplicate) {
            articlesDedup++;
            continue;
          }

          const isSyntacticDuplicate =
            await this.deduplicationEngine.isSyntacticDuplicate(article.title);

          if (isSyntacticDuplicate) {
            articlesDedup++;
            continue;
          }

          // It's a new article, save it
          // Resolve imageUrl: use extracted OG image or fallback to Unsplash stock photo
          let imageUrl = article.imageUrl || null;
          if (!imageUrl && process.env.UNSPLASH_ACCESS_KEY) {
            try {
              imageUrl = await this.fetchUnsplashImage(article.title);
            } catch {
              // Unsplash failure is non-fatal — article saves without image
            }
          }

          const savedArticle = await this.prisma.article.create({
            data: {
              sourceId: source.id,
              externalUrl: article.url,
              title: article.title,
              author: article.author,
              publishedAt: article.publishedAt,
              rawText: article.rawText,
              contentHash: hash,
              wordCount: article.rawText
                ? article.rawText.split(/\s+/).length
                : 0,
              imageUrl,
            },
          });

          articlesNew++;

          // Enqueue analysis job in BullMQ (CRIT-04: replaces eventEmitter.emit to eliminate race condition)
          // The job is enqueued AFTER prisma.article.create() returns, guaranteeing the article exists in DB.
          await this.analysisQueue.add('analyze-article', {
            articleId: savedArticle.id,
          });
        } catch (articleError: any) {
          this.logger.error(
            `Failed to process article ${article.url}: ${articleError.message}`,
          );
          errors++;
        }
      }

      await this.sourceRepository.recordCrawlHistory({
        sourceId,
        articlesFound,
        articlesNew,
        articlesDedup,
        errors,
        durationMs: Date.now() - startTime,
        trigger: trigger || 'SCHEDULED',
      });

      if (articlesNew > 0) {
        await this.sourceRepository.incrementArticleCount(
          sourceId,
          articlesNew,
        );
      }

      // Update last crawled timestamp
      // Update last crawled timestamp — using prisma directly since lastCrawledAt is
      // an internal operational field not part of the public UpdateSourceDto contract.
      await this.prisma.source.update({
        where: { id: sourceId },
        data: { lastCrawledAt: new Date() },
      });
    } catch (e: any) {
      this.logger.error(
        `Fatal error crawling source ${sourceId}: ${e.message}`,
      );

      await this.sourceRepository.recordCrawlHistory({
        sourceId,
        articlesFound: 0,
        articlesNew: 0,
        articlesDedup: 0,
        errors: 1,
        durationMs: Date.now() - startTime,
        trigger: trigger || 'SCHEDULED',
      });

      // Increment source error count directly
      await this.prisma.source.update({
        where: { id: sourceId },
        data: {
          errorCount: { increment: 1 },
          lastError: e.message,
        },
      });

      throw e;
    }
  }

  /**
   * Phase 2 fallback: fetch a relevant stock photo from Unsplash.
   * Only called when no OG image was found in the article/RSS feed.
   * Uses the UNSPLASH_ACCESS_KEY env variable — if not set, this is never called.
   */
  private async fetchUnsplashImage(title: string): Promise<string | null> {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return null;

    // Strip common stop words and take first 3 meaningful words as query
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'its',
      'it',
      'this',
      'that',
      'as',
      'from',
    ]);
    const keywords = title
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 3)
      .join(' ');

    if (!keywords) return null;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`,
        {
          signal: controller.signal as any,
          headers: { Authorization: `Client-ID ${key}` },
        },
      );
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      return data?.results?.[0]?.urls?.regular ?? null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
}
