import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DeduplicationEngine } from './deduplication.engine';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import * as crypto from 'crypto';
import Parser from 'rss-parser';
import { z } from 'zod';

const hunterResultSchema = z.object({
  articles: z
    .array(
      z.object({
        url: z.string().describe('The URL of the article'),
        title: z.string().describe('The title of the article'),
        summary: z
          .string()
          .describe('A summary of why this article is highly relevant'),
        author: z
          .string()
          .optional()
          .describe('The author if available, or publisher name'),
      }),
    )
    .describe(
      'List of the most highly relevant articles extracted from the search results',
    ),
});

@Injectable()
export class AiNewsHunterCron {
  private readonly logger = new Logger(AiNewsHunterCron.name);
  private readonly rssParser = new Parser();

  // The topics we want Gemini to hunt for
  private readonly targetTopics = [
    'GCCs in India',
    'Global Capability Centers Bangalore',
    'AI Startup Funding India',
    'Technology Leadership India',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly deduplicationEngine: DeduplicationEngine,
    @InjectQueue(QUEUES.ANALYSIS) private readonly analysisQueue: Queue,
  ) {}

  // Run every day at 8:00 AM
  @Cron('0 8 * * *')
  async runNewsHunter(): Promise<void> {
    this.logger.log('Starting AI News Hunter...');

    // 1. Ensure we have an "AI News Hunter" source in the DB
    let source = await this.prisma.source.findFirst({
      where: { name: 'AI News Hunter' },
    });

    if (!source) {
      source = await this.prisma.source.create({
        data: {
          name: 'AI News Hunter',
          type: 'RSS',
          url: 'https://news.google.com',
          status: 'ACTIVE',
          category: 'NEWS',
        },
      });
    }

    // 2. Loop through our target topics
    for (const topic of this.targetTopics) {
      this.logger.log(`Hunting for news on topic: ${topic}`);

      try {
        // Query Google News RSS
        const query = encodeURIComponent(topic);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

        const feed = await this.rssParser.parseURL(rssUrl);

        if (!feed.items || feed.items.length === 0) {
          this.logger.log(`No results found for topic: ${topic}`);
          continue;
        }

        // Take top 15 results to give to Gemini
        const topResults = feed.items.slice(0, 15).map((item) => ({
          title: item.title,
          url: item.link,
          date: item.pubDate,
          snippet: item.contentSnippet || item.content,
        }));

        // 3. Ask Gemini to filter and select the best ones
        const prompt = `
          You are an expert industry analyst looking for high-quality news for a B2B audience.
          I have searched Google News for "${topic}" and found the following recent articles:
          
          ${JSON.stringify(topResults, null, 2)}
          
          Your task:
          1. Review these articles.
          2. Discard any spam, low-quality, or irrelevant articles.
          3. Select ONLY the most insightful, highly relevant, and impactful articles (maximum 3 per topic).
          4. Extract their URL, title, and write a brief summary of why it's important.
        `;

        const result = await this.llmService.generateStructured(
          prompt,
          hunterResultSchema,
          {
            model: 'gemini-1.5-pro', // Use Gemini Pro for complex reasoning and extraction
            temperature: 0.2,
          },
        );

        // 4. Save the selected articles into the database
        for (const extractedArticle of result.articles) {
          try {
            // Check deduplication
            const hash = this.deduplicationEngine.generateHash(
              extractedArticle.url,
              extractedArticle.title,
              extractedArticle.summary,
            );
            const isDuplicate =
              await this.deduplicationEngine.isDuplicate(hash);
            const isSyntacticDuplicate =
              await this.deduplicationEngine.isSyntacticDuplicate(
                extractedArticle.title,
              );

            if (isDuplicate || isSyntacticDuplicate) {
              this.logger.debug(
                `Skipping duplicate article: ${extractedArticle.title}`,
              );
              continue;
            }

            // Generate OG Image Fallback
            const baseUrl =
              process.env.FRONTEND_URL || 'https://gcc-quest-web.vercel.app';
            const imageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('AI Discovered')}`;

            // Save to DB
            const savedArticle = await this.prisma.article.create({
              data: {
                sourceId: source.id,
                externalUrl: extractedArticle.url,
                title: extractedArticle.title,
                author: extractedArticle.author || 'AI News Hunter',
                publishedAt: new Date(),
                rawText: extractedArticle.summary, // We use the AI's summary as the raw text since we didn't scrape the full body
                contentHash: hash,
                wordCount: extractedArticle.summary.split(/\s+/).length,
                imageUrl,
              },
            });

            this.logger.log(
              `Successfully hunted and saved: ${savedArticle.title}`,
            );

            // 5. Send to Analysis Queue so the rest of the pipeline processes it normally
            await this.analysisQueue.add('analyze-article', {
              articleId: savedArticle.id,
            });
          } catch (e: any) {
            this.logger.error(
              `Error saving hunted article ${extractedArticle.url}: ${e.message}`,
            );
          }
        }
      } catch (e: any) {
        this.logger.error(`Error hunting for topic ${topic}: ${e.message}`);
      }
    }

    this.logger.log('AI News Hunter run complete!');
  }
}
