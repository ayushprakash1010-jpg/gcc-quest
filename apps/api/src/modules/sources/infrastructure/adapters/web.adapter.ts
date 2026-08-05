import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { ExtractedArticle } from './rss.adapter';

@Injectable()
export class WebAdapter {
  private readonly logger = new Logger(WebAdapter.name);

  constructor(private readonly ssrfGuard: SsrfGuardService) {}

  async fetch(source: {
    url: string;
    config?: any;
  }): Promise<ExtractedArticle[]> {
    const config =
      typeof source.config === 'object' && source.config !== null
        ? (source.config as any)
        : {};
    if (config.isIndexPage) {
      return this.fetchIndex(source.url, config.linkSelector);
    }
    return this.fetchUrl(source.url);
  }

  async fetchIndex(
    url: string,
    linkSelector?: string,
  ): Promise<ExtractedArticle[]> {
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
        throw new Error(
          `HTTP error fetching index! status: ${response.status}`,
        );
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      let links: string[] = [];
      const selector = linkSelector || 'a';

      $(selector).each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).href;
            if (absoluteUrl.startsWith('http')) {
              links.push(absoluteUrl);
            }
          } catch (e) {
            // ignore invalid urls
          }
        }
      });

      links = [...new Set(links)];
      if (!linkSelector) {
        links = links.filter(
          (l) =>
            l.length > url.length + 5 &&
            !l.includes('#') &&
            !l.toLowerCase().includes('login') &&
            !l.toLowerCase().includes('contact'),
        );
      }

      // Limit to 5 to avoid timeouts and bot blocks
      const topLinks = links.slice(0, 5);
      this.logger.log(
        `Found ${links.length} links on index page ${url}, spidering top ${topLinks.length}`,
      );

      const articles: ExtractedArticle[] = [];
      for (const link of topLinks) {
        try {
          const result = await this.fetchUrl(link);
          if (result && result.length > 0) articles.push(...result);
        } catch (e: any) {
          this.logger.warn(
            `Failed to fetch spidered link ${link}: ${e.message}`,
          );
        }
      }
      return articles;
    } catch (error: any) {
      this.logger.error(`Failed to crawl index page ${url}: ${error.message}`);
      return [];
    }
  }

  async fetchUrl(url: string): Promise<ExtractedArticle[]> {
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

      $('nav, footer, aside, .ad, .ads, script, style, noscript').remove();

      let mainContent = $('article').text();
      if (!mainContent || mainContent.trim().length === 0) {
        mainContent = $('main').text();
      }
      if (!mainContent || mainContent.trim().length === 0) {
        mainContent = $('body').text();
      }

      const title = $('title').text() || 'Untitled';

      return [
        {
          title: title.trim(),
          url: url,
          rawText: mainContent.trim().replace(/\s+/g, ' '),
          publishedAt: new Date(),
        },
      ];
    } catch (error: any) {
      this.logger.error(`Failed to parse Web page ${url}: ${error.message}`);
      return [];
    }
  }
}
