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
}
