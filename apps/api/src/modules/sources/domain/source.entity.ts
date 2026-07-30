import {
  SourceType,
  SourceCategory,
  CrawlFrequency,
  SourceStatus,
} from '@prisma/client';

export class SourceEntity {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  category: SourceCategory;
  crawlFrequency: CrawlFrequency;
  status: SourceStatus;
  config?: any;
  lastCrawledAt?: Date | null;
  nextCrawlAt?: Date | null;
  totalArticles: number;
  errorCount: number;
  lastError?: string | null;
  tags: string[];
  trustScore: number;
  authorityScore: number;
  freshnessScore: number;
  compositeScore: number;
  robotsTxtChecked: boolean;
  robotsTxtAllowed: boolean;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<SourceEntity>) {
    Object.assign(this, partial);
  }
}
