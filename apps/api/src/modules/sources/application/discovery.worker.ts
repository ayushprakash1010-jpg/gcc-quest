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
}
