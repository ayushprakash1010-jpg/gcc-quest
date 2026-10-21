import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DeduplicationEngine } from './deduplication.engine';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUES } from '../../../infrastructure/queue/queue.constants';
import * as Parser from 'rss-parser';
import * as cheerio from 'cheerio';
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
  private lastPollinationsTime = 0;

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

  // Run every day at 7:30 AM IST — 30 minutes before the 8 AM RSS crawl
  // to avoid competing with the AnalysisProcessor for the shared Gemini RPM quota.
  @Cron('30 7 * * *', { timeZone: 'Asia/Kolkata' })
  async runNewsHunter(): Promise<void> {
    this.logger.log('Starting GCC Quest AI News Hunter...');

    // 1. Ensure we have a "GCC Quest AI" source in the DB
    let source = await this.prisma.source.findFirst({
      where: { name: 'GCC Quest AI' },
    });

    if (!source) {
      source = await this.prisma.source.create({
        data: {
          name: 'GCC Quest AI',
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

          PRIORITY 2 — MAY SELECT a maximum of 1 (counts against the 2-article budget, not in addition):
          - India deeptech or enterprise tech startup funding with clear GCC-sector relevance
          - Women leaders or founders in India's GCC or enterprise tech ecosystem

          HARD DISCARD — never select these:
          - Consumer startup funding (D2C, fintech, edtech, gaming) with no GCC connection
          - Generic global AI product releases with no India GCC context
          - General stock market, mutual fund, or retail investment news
          - Celebrity, sports, or lifestyle content

          Select EXACTLY 2 articles total — no more, no fewer.
          If fewer than 2 articles meet the criteria, return only the qualifying ones. Do NOT force-select off-topic articles just to reach 2.
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
        // Hard cap: enforce max 2 per topic regardless of what Gemini returns
        const selectedArticles = result.articles.slice(0, 2);
        for (const extractedArticle of selectedArticles) {
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

            // 1. Safely extract real publisher/article image (e.g. CEO headshot or office photo)
            let backgroundImageUrl = await this.extractOgImage(
              extractedArticle.url,
            );
            if (backgroundImageUrl) {
              this.logger.log(
                `Extracted real article photo for "${extractedArticle.title}": ${backgroundImageUrl}`,
              );
            } else {
              // 2. If no real photo was found, generate a tailored 3D conceptual visual in the background ($0 cost)
              this.logger.log(
                `No real photo found for "${extractedArticle.title}". Generating tailored 3D visual in background...`,
              );
              backgroundImageUrl = await this.generate3dVisualUrl(
                extractedArticle.title,
                extractedArticle.summary,
              );
            }

            // 3. Generate Branded OG Image URL (composited with real photo or 3D visual as bg)
            const baseUrl =
              process.env.FRONTEND_URL || 'https://gcc-quest-web.vercel.app';
            const imageUrl = backgroundImageUrl
              ? `${baseUrl}/api/og?bg=${encodeURIComponent(backgroundImageUrl)}&title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('GCC Quest AI')}`
              : `${baseUrl}/api/og?title=${encodeURIComponent(extractedArticle.title)}&source=${encodeURIComponent('GCC Quest AI')}`;

            // Save to DB
            const savedArticle = await this.prisma.article.create({
              data: {
                sourceId: source.id,
                externalUrl: extractedArticle.url,
                title: extractedArticle.title,
                author: extractedArticle.author || 'GCC Quest AI',
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

    this.logger.log('GCC Quest AI News Hunter run complete!');
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

  /**
   * Safely attempts to extract the publisher's real article image (e.g. executive photo,
   * corporate building, or official press visual) directly from the webpage OpenGraph tags.
   * Fails fast (3.5s timeout) and gracefully returns null if unreachable or blocked.
   */
  private async extractOgImage(url: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let ogImage =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[property="og:image:url"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content');

      if (!ogImage || typeof ogImage !== 'string') {
        return null;
      }

      ogImage = ogImage.trim();

      // Resolve relative URLs to absolute URLs
      if (ogImage.startsWith('/') || !ogImage.startsWith('http')) {
        try {
          ogImage = new URL(ogImage, url).toString();
        } catch {
          return null;
        }
      }

      // Filter out tracking pixels, icons, SVGs, or tiny spacer gifs
      const lower = ogImage.toLowerCase();
      if (
        lower.endsWith('.svg') ||
        lower.includes('favicon') ||
        lower.includes('1x1') ||
        lower.includes('pixel') ||
        lower.includes('spacer') ||
        lower.includes('logo-small')
      ) {
        return null;
      }

      return ogImage;
    } catch {
      // Gracefully swallow network/timeout errors — never fail article hunting
      return null;
    }
  }

  /**
   * Generates a tailored 3D conceptual illustration prompt matching the article's topic,
   * modeled after the executive LinkedIn post styles (German flags, growth arrows, tech icons).
   */
  private build3dPrompt(title: string, summary: string): string {
    const combined = `${title} ${summary}`.toLowerCase();

    // 1. Bilateral relations & cross-border GCCs (like Manager German/Indian flags style)
    if (combined.includes('german') || combined.includes('germany')) {
      return '3D render illustration of German flag and Indian flag standing outside futuristic corporate glass headquarters, modern enterprise campus, clean cinematic lighting, 8k';
    }
    if (combined.includes('japan') || combined.includes('japanese')) {
      return '3D render illustration of Japanese flag and Indian flag standing outside modern corporate tech park, sleek glass architecture, 8k';
    }
    if (
      combined.includes('united states') ||
      combined.includes('american') ||
      combined.includes(' u.s.') ||
      combined.includes(' us ')
    ) {
      return '3D render illustration of American flag and Indian flag standing outside modern glass enterprise innovation hub, architectural 3D visualization, 8k';
    }
    if (
      combined.includes('united kingdom') ||
      combined.includes('british') ||
      combined.includes(' uk ')
    ) {
      return '3D render illustration of British flag and Indian flag standing outside modern glass corporate campus, architectural photography, 8k';
    }

    // 2. City-specific trajectory & leasing (like Manager Hyderabad growth arrow style)
    if (
      combined.includes('hyderabad') ||
      combined.includes('cyberabad') ||
      combined.includes('hitec')
    ) {
      return '3D render illustration of Hyderabad city skyline with a bold glowing cyan 3D growth arrow arching upwards over corporate glass towers, modern enterprise campus, clean lighting, 8k';
    }
    if (combined.includes('bengaluru') || combined.includes('bangalore')) {
      return '3D render illustration of futuristic Bengaluru cyber tech corridor, illuminated glass skyscrapers with glowing upward cyan trajectory line, dusk corporate atmosphere, 8k';
    }
    if (
      combined.includes('pune') ||
      combined.includes('chennai') ||
      combined.includes('mumbai') ||
      combined.includes('noida') ||
      combined.includes('gurugram') ||
      combined.includes('gurgaon')
    ) {
      return '3D render illustration of modern Indian financial cyber district with modern glass towers and glowing upward commercial growth arrow, architectural photography, 8k';
    }

    // 3. AI, Software & Engineering (like Manager IT worker with floating 3D icons style)
    if (
      combined.includes('ai') ||
      combined.includes('genai') ||
      combined.includes('artificial intelligence') ||
      combined.includes('machine learning') ||
      combined.includes('llm') ||
      combined.includes('automation')
    ) {
      return '3D render illustration of modern tech professional working on laptop with floating glowing 3D holographic icons of AI brain, code brackets, gear analytics, glowing blue and cyan lighting, futuristic corporate tech office, 8k';
    }

    // 4. Jobs, Workforce, Talent & Reskilling
    if (
      combined.includes('workforce') ||
      combined.includes('talent') ||
      combined.includes('job') ||
      combined.includes('hiring') ||
      combined.includes('reskill') ||
      combined.includes('headcount') ||
      combined.includes('salary')
    ) {
      return '3D render illustration of modern tech workforce collaboration in glass innovation hub, diverse engineers, floating 3D growth data charts, contemporary architectural style, 8k';
    }

    // 5. Real Estate, Leasing & Office Campus
    if (
      combined.includes('leasing') ||
      combined.includes('real estate') ||
      combined.includes('office') ||
      combined.includes('space') ||
      combined.includes('sq ft') ||
      combined.includes('square feet')
    ) {
      return '3D render illustration of grand modern glass corporate campus, landscaped commercial tech park in India, architectural 3D visualization, daylight, 8k';
    }

    // 6. Leadership & Executive CXO
    if (
      combined.includes('cxo') ||
      combined.includes('leader') ||
      combined.includes('ceo') ||
      combined.includes('appoint') ||
      combined.includes('director')
    ) {
      return '3D render illustration of executive high-floor corporate boardroom in glass skyscraper, conference table, panoramic window view of modern metropolis, sleek corporate atmosphere, 8k';
    }

    // 7. Research, Data Reports & Ecosystem Studies (NASSCOM, Zinnov, CBRE, JLL)
    if (
      combined.includes('nasscom') ||
      combined.includes('zinnov') ||
      combined.includes('report') ||
      combined.includes('survey') ||
      combined.includes('study') ||
      combined.includes('forecast') ||
      combined.includes('market size')
    ) {
      return '3D render illustration of modern corporate data analytics and market research report, glowing holographic 3D bar charts, growth metrics, clean corporate glass background, 8k';
    }

    // 8. General Enterprise & Innovation Hub
    return '3D render illustration of modern multinational enterprise innovation hub in India, sleek glass facade, landscaped corporate park, bright daylight, architectural 3D visualization, 8k';
  }

  /**
   * Generates a unique 3D visual in the background for $0 and pre-caches it on CDN.
   * Enforces a 45s safety delay between calls to respect free tier rate limits.
   */
  private async generate3dVisualUrl(
    title: string,
    summary: string,
  ): Promise<string | null> {
    try {
      // Respect Pollinations free rate limit (45 seconds between requests)
      const now = Date.now();
      const elapsed = now - this.lastPollinationsTime;
      if (elapsed < 46000 && this.lastPollinationsTime > 0) {
        const waitMs = 46000 - elapsed;
        this.logger.log(
          `Waiting ${(waitMs / 1000).toFixed(1)}s to respect free 3D visual rate limit...`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      }

      const promptText = this.build3dPrompt(title, summary);
      const seed =
        Math.abs(
          title
            .split('')
            .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0),
        ) % 1000000;

      const encodedPrompt = encodeURIComponent(promptText);
      const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1080&model=turbo&seed=${seed}&nologo=true`;

      // Pre-warm the cache on the CDN in the background
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      this.lastPollinationsTime = Date.now();

      if (res.ok) {
        this.logger.log(
          `Generated tailored 3D conceptual visual for "${title}"`,
        );
        return url;
      }

      this.logger.warn(
        `3D generation returned status ${res.status} for "${title}".`,
      );
      return null;
    } catch (err: any) {
      this.logger.warn(`Failed to generate 3D visual: ${err.message}`);
      return null;
    }
  }
}
