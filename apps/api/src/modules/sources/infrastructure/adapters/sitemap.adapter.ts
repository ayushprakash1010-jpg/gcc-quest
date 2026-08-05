import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { ExtractedArticle } from './rss.adapter';
import { WebAdapter } from './web.adapter';

@Injectable()
export class SitemapAdapter {
  private readonly logger = new Logger(SitemapAdapter.name);

  constructor(
    private readonly ssrfGuard: SsrfGuardService,
    private readonly webAdapter: WebAdapter,
  ) {}

  async fetch(url: string): Promise<ExtractedArticle[]> {
    this.ssrfGuard.assertSafeUrl(url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        signal: controller.signal as any,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/xml, text/xml, */*',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `HTTP error fetching sitemap! status: ${response.status}`,
        );
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      // Find all <loc> tags which contain the URLs
      const urls: string[] = [];
      $('loc').each((_, el) => {
        const text = $(el).text();
        if (text) {
          urls.push(text.trim());
        }
      });

      if (urls.length === 0) {
        this.logger.warn(`No URLs found in sitemap at ${url}`);
        return [];
      }

      // Take the top 10 URLs (most recent usually)
      const topUrls = urls.slice(0, 10);
      this.logger.log(
        `Found ${urls.length} URLs in sitemap, processing top ${topUrls.length}`,
      );

      // Process each URL using the single-page WebAdapter
      const articles: ExtractedArticle[] = [];
      for (const locUrl of topUrls) {
        try {
          const fetched = await this.webAdapter.fetch(locUrl);
          if (fetched && fetched.length > 0) {
            articles.push(...fetched);
          }
        } catch (err: any) {
          this.logger.warn(
            `Failed to fetch sitemap URL ${locUrl}: ${err.message}`,
          );
        }
      }

      return articles;
    } catch (error: any) {
      this.logger.error(`Failed to parse Sitemap ${url}: ${error.message}`);
      return [];
    }
  }
}
