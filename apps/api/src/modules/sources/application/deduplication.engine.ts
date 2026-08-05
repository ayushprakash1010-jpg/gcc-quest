import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class DeduplicationEngine {
  constructor(private readonly prisma: PrismaService) {}

  generateHash(url: string, title: string, rawText?: string): string {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    const content = `${normalize(url)}||${normalize(title)}||${rawText ? normalize(rawText) : ''}`;
    return createHash('sha256').update(content).digest('hex');
  }

  async isDuplicate(hash: string): Promise<boolean> {
    const existing = await this.prisma.article.findUnique({
      where: { contentHash: hash },
      select: { id: true },
    });
    return !!existing;
  }

  private calculateJaccardSimilarity(str1: string, str2: string): number {
    // Only compare words longer than 2 chars, alphanumeric
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

  async isSyntacticDuplicate(
    title: string,
    threshold: number = 0.75,
  ): Promise<boolean> {
    const recentDate = new Date();
    recentDate.setHours(recentDate.getHours() - 72); // Look back 3 days

    const recentArticles = await this.prisma.article.findMany({
      where: { discoveredAt: { gte: recentDate } },
      select: { title: true },
    });

    for (const article of recentArticles) {
      if (this.calculateJaccardSimilarity(title, article.title) >= threshold) {
        return true;
      }
    }

    return false;
  }
}
