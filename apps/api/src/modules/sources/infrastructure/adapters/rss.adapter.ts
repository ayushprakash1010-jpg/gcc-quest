import { Injectable, Logger } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';

export interface ExtractedArticle {
  title: string;
  url: string;
  author?: string;
  publishedAt?: Date;
  rawText?: string;
  imageUrl?: string; // OG image or RSS media thumbnail
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
      // Capture common image fields from RSS feeds
      customFields: {
        item: [
          ['media:content', 'mediaContent', { keepArray: false }],
          ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
          ['enclosure', 'enclosure', { keepArray: false }],
        ],
      },
    });
  }

  /** Extracts the best available image URL from an RSS feed item */
  private extractImageFromItem(item: any): string | undefined {
    // 1. media:content (most common in news RSS feeds like Hindu BusinessLine, ET)
    if (item.mediaContent?.$.url) return item.mediaContent.$.url;
    // 2. media:thumbnail
    if (item.mediaThumbnail?.$.url) return item.mediaThumbnail.$.url;
    // 3. enclosure (used by some feeds for attachments)
    if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    // 4. itunes:image (podcasts/some feeds)
    if ((item as any)['itunes:image']?.href) {
      return (item as any)['itunes:image'].href;
    }
    return undefined;
  }

  async fetch(source: {
    url: string;
    config?: any;
  }): Promise<ExtractedArticle[]> {
    const url = source.url;
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
          imageUrl: this.extractImageFromItem(item),
        }))
        .filter((a) => a.url); // Must have a URL

      return articles;
    } catch (error: any) {
      this.logger.error(`Failed to parse RSS feed ${url}: ${error.message}`);
      return [];
    }
  }
}
