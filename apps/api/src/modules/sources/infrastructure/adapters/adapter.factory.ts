import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { RssAdapter } from './rss.adapter';
import { WebAdapter } from './web.adapter';

@Injectable()
export class AdapterFactory {
  constructor(
    private readonly rssAdapter: RssAdapter,
    private readonly webAdapter: WebAdapter,
  ) {}

  getAdapter(type: SourceType) {
    switch (type) {
      case SourceType.RSS:
        return this.rssAdapter;
      case SourceType.WEB:
      case SourceType.SITEMAP: // For MVP, treating sitemap similar to WEB/RSS depending on implementation, but let's default to WEB or we can implement a separate Sitemap adapter later. For now, WEB acts as fallback.
        return this.webAdapter;
      default:
        throw new InternalServerErrorException(
          `No adapter found for source type: ${type}`,
        );
    }
  }
}
