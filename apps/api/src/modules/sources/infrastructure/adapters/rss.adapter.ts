import { Injectable, Logger } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';

export interface ExtractedArticle {
  title: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  rawText?: string;
}

@Injectable()
export class RssAdapter {
  private readonly parser: Parser;
  private readonly logger = new Logger(RssAdapter.name);

  constructor(private readonly ssrfGuard: SsrfGuardService) {
    this.parser = new Parser({
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'application/rss+xml, application/xml, application/atom+xml, text/xml, text/html, */*',
      },
    });
  }

  async fetch(url: string): Promise<ExtractedArticle[]> {
    this.ssrfGuard.assertSafeUrl(url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        signal: controller.signal as any,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'application/rss+xml, application/xml, application/atom+xml, text/xml, text/html, */*',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xml = await response.text();
      const feed = await this.parser.parseString(xml);

      const articles: ExtractedArticle[] = feed.items
        .map((item) => ({
          title: item.title || 'Untitled',
          url: item.link || '',
          author: item.creator || item.author,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          rawText: item.contentSnippet || item.content || item.title,
        }))
        .filter((a) => a.url); // Must have a URL

      return articles;
    } catch (error: any) {
      this.logger.error(`Failed to parse RSS feed ${url}: ${error.message}`);
      return [];
    }
  }
}
