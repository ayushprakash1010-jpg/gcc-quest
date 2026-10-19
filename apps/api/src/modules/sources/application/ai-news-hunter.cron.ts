import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DeduplicationEngine } from './deduplication.engine';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import * as Parser from 'rss-parser';
import { z } from 'zod';

const hunterResultSchema = z.object({
  articles: z
    .array(
      z.object({
        url: z.string().describe('The URL of the article'),
        title: z.string().describe('The title of the article'),
        summary: z
          .string()
          .describe(
            'A detailed 2-3 paragraph summary explaining the announcement, strategic details, numbers (headcount, investment), and why it is highly relevant to India GCCs',
          ),
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

  // The topics we want Gemini to hunt for — 6 core topics × 2 articles = ~12 per daily run
  private readonly targetTopics = [
    // Core GCC expansion & new setups
    'Global Capability Center GCC expansion India 2026',

    // City-specific leasing & real estate (manager priority: Hyderabad leasing surge)
    'Hyderabad Bangalore GCC leasing office real estate 2026',

    // Cross-border GCC: European/US companies entering India (manager priority: German companies)
    'European German American company GCC India expansion',

    // Workforce, reskilling, AI impact on GCC jobs (manager priority: AI & future of GCC jobs)
    'GCC India workforce reskilling AI jobs hiring 2026',

    // Research & data-led stories from NASSCOM, Zinnov, JLL, CBRE
    'NASSCOM Zinnov GCC India report data 2026',

    // GCC leadership & strategy (generates high-engagement content like Deutsche Bank, CEO strategy)
    'GCC India CXO leadership technology innovation strategy',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly deduplicationEngine: DeduplicationEngine,
    @InjectQueue(QUEUES.ANALYSIS) private readonly analysisQueue: Queue,
  ) {}

  // Run every day at 8:00 AM IST
  @Cron('0 8 * * *', { timeZone: 'Asia/Kolkata' })
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

        // 3. Pre-fetch recent articles from DB (past 7 days) to filter out duplicates in memory
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentArticles = await this.prisma.article.findMany({
          where: { discoveredAt: { gte: recentDate } },
          select: { externalUrl: true, title: true, contentHash: true },
        });

        const existingUrls = new Set(
          recentArticles.map((a) => a.externalUrl).filter(Boolean),
        );
        const existingHashes = new Set(
          recentArticles.map((a) => a.contentHash).filter(Boolean),
        );
        const recentTitles = recentArticles.map((a) => a.title).filter(Boolean);

        // Pre-filter feed items so Gemini only sees fresh, unseen articles!
        const freshCandidates: Array<{
          title: string;
          url: string;
          date?: string;
          snippet?: string;
        }> = [];

        for (const item of feed.items) {
          if (!item.title || !item.link) continue;

          // Check direct URL duplicate
          if (existingUrls.has(item.link)) {
            this.logger.debug(
              `Pre-filter skipping existing URL: ${item.title}`,
            );
            continue;
          }

          // Check content hash
          const hash = this.deduplicationEngine.generateHash(
            item.link,
            item.title,
          );
          if (existingHashes.has(hash)) {
            this.logger.debug(
              `Pre-filter skipping duplicate hash: ${item.title}`,
            );
            continue;
          }

          // Check syntactic similarity against recent article titles
          const isSyntacticDup = recentTitles.some((existingTitle) => {
            const similarity = this.calculateSimilarity(
              item.title!,
              existingTitle,
            );
            return similarity >= 0.75;
          });

          if (isSyntacticDup) {
            this.logger.debug(
              `Pre-filter skipping syntactic duplicate: ${item.title}`,
            );
            continue;
          }

          freshCandidates.push({
            title: item.title,
            url: item.link,
            date: item.pubDate,
            snippet: item.contentSnippet || item.content,
          });

          if (freshCandidates.length >= 15) {
            break;
          }
        }

        if (freshCandidates.length === 0) {
          this.logger.log(
            `All ${feed.items.length} articles for topic "${topic}" were already ingested in recent runs.`,
          );
          continue;
        }

        this.logger.log(
          `Found ${freshCandidates.length} fresh, unseen candidate articles for topic: ${topic}`,
        );

        // 4. Ask Gemini to filter and select the top 2-3 from fresh candidates
        const prompt = `
          You are an expert content analyst for GCC Quest — a platform exclusively covering
          Global Capability Centers (GCCs) in India.

          CONTEXT: A GCC (Global Capability Center) is a captive unit set up by a
          multinational company in India to deliver technology, R&D, operations, or
          shared services for the parent company globally.
          Examples: Walmart Global Tech India, Goldman Sachs Bengaluru, HSBC Tech India,
          Bosch Engineering India, JP Morgan India GCC.

          I searched Google News for "${topic}" and found these FRESH, UNSEEN articles:

          ${JSON.stringify(freshCandidates, null, 2)}

          YOUR TASK — be a strict editorial filter:

          PRIORITY 1 — MUST SELECT if present (these are primary GCC stories):
          - A multinational company setting up, expanding, or restructuring a GCC in India
          - GCC workforce news: hiring surges, reskilling programs, AI impact on GCC jobs
          - GCC real estate: office leasing data, city-wise growth, SEZ announcements
          - Policy or government initiatives directly supporting GCCs
          - Research/data reports on India's GCC ecosystem (NASSCOM, Zinnov, JLL, CBRE)

          PRIORITY 2 — MAY SELECT a maximum of 1 per run (secondary content):
          - India deeptech or enterprise tech startup funding with clear GCC-sector relevance
          - Women leaders or founders in India's GCC or enterprise tech ecosystem

          HARD DISCARD — never select these:
          - Consumer startup funding (D2C, fintech, edtech, gaming) with no GCC connection
          - Generic global AI product releases with no India GCC context
          - General stock market, mutual fund, or retail investment news
          - Celebrity, sports, or lifestyle content

          Select 2 (up to 3 if multiple high-impact stories exist) articles total.
          If fewer than 2 articles meet the criteria, return only the qualifying ones. Do NOT force-select off-topic articles.
          For each selected article, write a detailed 2 to 3 paragraph summary explaining the core announcement, specific numbers/metrics (headcount, location, investment), the strategic business rationale, and why it is significant to India's GCC ecosystem.
        `;

        const result = await this.llmService.generateStructured(
          prompt,
          hunterResultSchema,
          {
            model: 'gemini-3.8-flash', // gemini-3.8-flash with automatic gemini-3.5-flash-lite fallback on 503
            temperature: 0.2,
          },
        );

        // Safety check: if Gemini returned an empty list (e.g. rate-limit mock),
        // treat it as a retriable error instead of silently producing zero articles.
        if (!result.articles || result.articles.length === 0) {
          this.logger.warn(
            `Gemini returned 0 articles for topic "${topic}" — skipping topic (possible rate limit or no relevant results).`,
          );
          continue;
        }

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

            // Keep in-memory deduplication cache up-to-date for subsequent topics
            existingUrls.add(savedArticle.externalUrl);
            existingHashes.add(hash);
            recentTitles.push(savedArticle.title);

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

  private calculateSimilarity(str1: string, str2: string): number {
    const tokenize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);

    const set1 = new Set(tokenize(str1));
    const set2 = new Set(tokenize(str2));

    if (set1.size === 0 && set2.size === 0) return 1.0;
    if (set1.size === 0 || set2.size === 0) return 0.0;

    let intersectionSize = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersectionSize++;
      }
    }

    const unionSize = set1.size + set2.size - intersectionSize;
    return intersectionSize / unionSize;
  }
}
