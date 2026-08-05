import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { RssAdapter } from './rss.adapter';
import { WebAdapter } from './web.adapter';
import { SitemapAdapter } from './sitemap.adapter';

@Injectable()
export class AdapterFactory {
  constructor(
    private readonly rssAdapter: RssAdapter,
    private readonly webAdapter: WebAdapter,
    private readonly sitemapAdapter: SitemapAdapter,
  ) {}

  getAdapter(type: SourceType) {
    switch (type) {
      case SourceType.RSS:
        return this.rssAdapter;
      case SourceType.WEB:
        return this.webAdapter;
      case SourceType.SITEMAP:
        return this.sitemapAdapter;
      default:
        throw new InternalServerErrorException(
          `No adapter found for source type: ${type}`,
        );
    }
  }
}
