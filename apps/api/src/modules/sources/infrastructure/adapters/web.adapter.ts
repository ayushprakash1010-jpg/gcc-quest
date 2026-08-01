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
      const response = await fetch(url);
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

      // We extract only one "article" representing the page itself,
      // because a WEB source without RSS usually means we crawl individual pages
      // However, if the WEB source is a listing page, we'd need a scraper logic.
      // For MVP, we treat the provided URL as the article or main page.

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
