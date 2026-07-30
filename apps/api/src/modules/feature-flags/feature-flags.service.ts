import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  // In a real app we would cache this in Redis.
  // For Sprint 1, we fetch from DB or memory cache.
  private cache: Record<string, { value: boolean; expiresAt: number }> = {};

  constructor(private prisma: PrismaService) {}

  async isEnabled(flag: string): Promise<boolean> {
    const now = Date.now();
    if (this.cache[flag] && this.cache[flag].expiresAt > now) {
      return this.cache[flag].value;
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: flag },
    });

    const isEnabled = setting ? setting.value === 'true' : false;

    // Cache for 60s
    this.cache[flag] = {
      value: isEnabled,
      expiresAt: now + 60000,
    };

    return isEnabled;
  }

  async setFlag(flag: string, value: boolean, userId?: string): Promise<void> {
    await this.prisma.systemSetting.update({
      where: { key: flag },
      data: {
        value: value ? 'true' : 'false',
        updatedBy: userId,
      },
    });

    // Invalidate cache
    delete this.cache[flag];
    this.logger.log(`Feature flag ${flag} set to ${value}`);
  }

  async getAllFlags(): Promise<Record<string, boolean>> {
    const flags = await this.prisma.systemSetting.findMany({
      where: { key: { startsWith: 'feature.' } },
    });

    return flags.reduce(
      (acc: Record<string, boolean>, flag: { key: string; value: string }) => {
        acc[flag.key] = flag.value === 'true';
        return acc;
      },
      {} as Record<string, boolean>,
    );
  }
}
