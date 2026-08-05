import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { ExtractedArticle } from './rss.adapter';

@Injectable()
export class WebAdapter {
  private readonly logger = new Logger(WebAdapter.name);

  constructor(private readonly ssrfGuard: SsrfGuardService) {}

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
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Strip nav, footer, ads
      $('nav, footer, aside, .ad, .ads, script, style, noscript').remove();

      // Find main content block
      let mainContent = $('article').text();
      if (!mainContent || mainContent.trim().length === 0) {
        mainContent = $('main').text();
      }
      if (!mainContent || mainContent.trim().length === 0) {
        mainContent = $('body').text();
      }

      // WARNING: WebAdapter is strictly for single-page scraping (e.g. reading a single article).
      // It does NOT follow pagination or links. For listing pages or multi-page crawling,
      // use the RSS or SITEMAP source types instead.

      const title = $('title').text() || 'Untitled';

      return [
        {
          title: title.trim(),
          url: url, // the page itself
          rawText: mainContent.trim().replace(/\s+/g, ' '),
          publishedAt: new Date(), // hard to extract reliably without metadata
        },
      ];
    } catch (error: any) {
      this.logger.error(`Failed to parse Web page ${url}: ${error.message}`);
      return [];
    }
  }
}
