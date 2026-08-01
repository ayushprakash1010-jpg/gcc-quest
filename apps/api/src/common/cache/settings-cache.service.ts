import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

interface CacheEntry {
  value: string | null;
  cachedAt: number;
}

/**
 * In-memory cache for SystemSetting values.
 *
 * Problem it solves (HIGH-06):
 * SystemSettings (like `config.analysis_threshold`) were being queried from
 * the database on EVERY article analyzed — potentially 100+ DB hits per crawl.
 * These settings almost never change in real-time.
 *
 * Solution:
 * A simple Map-based cache with a 5-minute TTL. On a cache miss, the value is
 * fetched from the DB and stored. All subsequent reads within 5 minutes are served
 * from memory. If a setting is changed in the DB, it takes effect within 5 minutes.
 *
 * No Redis required — this is a pure TypeScript in-process cache.
 * Suitable for single-instance deployments (the current architecture).
 */
@Injectable()
export class SettingsCacheService {
  private readonly logger = new Logger(SettingsCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets a system setting value, using the cache if valid.
   *
   * @param key      The SystemSetting key (e.g., 'config.analysis_threshold')
   * @param fallback Default value if the key does not exist in the database
   */
  async get(key: string, fallback: string): Promise<string> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.cachedAt < this.TTL_MS) {
      return cached.value ?? fallback;
    }

    // Cache miss — fetch from DB
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    const value = setting?.value ?? null;
    this.cache.set(key, { value, cachedAt: now });

    if (!setting) {
      this.logger.debug(
        `SystemSetting "${key}" not found in DB, using fallback: ${fallback}`,
      );
    }

    return value ?? fallback;
  }

  /**
   * Explicitly invalidates a single cached setting.
   * Call this after programmatically changing a setting value in the DB
   * if you need the new value to take effect immediately.
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /** Clears the entire cache. Useful for testing or forced refresh. */
  clear(): void {
    this.cache.clear();
  }
}
