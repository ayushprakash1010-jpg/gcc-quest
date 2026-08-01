import { SettingsCacheService } from './settings-cache.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

/**
 * Unit tests for SettingsCacheService (HIGH-06 cache)
 *
 * Uses a Jest mock for PrismaService to avoid any real database connection.
 * Tests focus on:
 *   1. Cache miss → DB fetch → cache store
 *   2. Cache hit → no DB fetch (within TTL)
 *   3. TTL expiry → re-fetch from DB
 *   4. Fallback value when key not in DB
 *   5. invalidate() and clear() behaviour
 */
describe('SettingsCacheService', () => {
  let service: SettingsCacheService;
  let mockPrisma: jest.Mocked<Pick<PrismaService, 'systemSetting'>>;

  beforeEach(() => {
    // Create a minimal Prisma mock with jest functions
    mockPrisma = {
      systemSetting: {
        findUnique: jest.fn(),
      } as any,
    };

    service = new SettingsCacheService(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clear();
  });

  // ─── Cache Miss → DB Fetch ──────────────────────────────────────────────────
  describe('cache miss', () => {
    it('should fetch from DB on the first call (cache miss)', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'feature.story_clustering',
        value: 'true',
      });

      const result = await service.get('feature.story_clustering', 'false');

      expect(result).toBe('true');
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'feature.story_clustering' },
      });
    });

    it('should return the fallback when the key does not exist in DB', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.get('config.nonexistent_key', 'my-default');

      expect(result).toBe('my-default');
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Cache Hit (Within TTL) ─────────────────────────────────────────────────
  describe('cache hit', () => {
    it('should NOT call the DB on the second call within TTL', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'config.cluster_similarity',
        value: '0.85',
      });

      // First call → DB hit
      const first = await service.get('config.cluster_similarity', '0.75');
      // Second call → should be served from cache
      const second = await service.get('config.cluster_similarity', '0.75');

      expect(first).toBe('0.85');
      expect(second).toBe('0.85');
      // DB should only have been called ONCE
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should serve the same cached value for sequential callers after first call', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'config.cluster_window_hours',
        value: '72',
      });

      // First call — DB hit, populates cache
      const first = await service.get('config.cluster_window_hours', '24');
      // Second and third calls — cache hit, no DB
      const second = await service.get('config.cluster_window_hours', '24');
      const third = await service.get('config.cluster_window_hours', '24');

      expect([first, second, third]).toEqual(['72', '72', '72']);
      // Only the very first call should hit the DB
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ─── TTL Expiry ─────────────────────────────────────────────────────────────
  describe('TTL expiry', () => {
    it('should re-fetch from DB after the TTL expires', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'some.setting',
        value: 'old-value',
      });

      // First call — populates cache
      await service.get('some.setting', 'fallback');

      // Manipulate the cache to simulate TTL expiry by setting cachedAt in the past
      const cache = (service as any).cache as Map<
        string,
        { value: string; cachedAt: number }
      >;
      const entry = cache.get('some.setting')!;
      cache.set('some.setting', {
        ...entry,
        cachedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago (past 5-min TTL)
      });

      // Update the DB mock to return a new value
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'some.setting',
        value: 'new-value',
      });

      const result = await service.get('some.setting', 'fallback');

      expect(result).toBe('new-value');
      // DB should now have been called TWICE (once initially, once after TTL)
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ─── invalidate() ───────────────────────────────────────────────────────────
  describe('invalidate()', () => {
    it('should force a DB re-fetch after a key is invalidated', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'feature.story_clustering',
        value: 'true',
      });

      // First call — DB hit, cached
      await service.get('feature.story_clustering', 'false');
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(1);

      // Invalidate the specific key
      service.invalidate('feature.story_clustering');

      // Second call — cache was cleared, DB hit again
      await service.get('feature.story_clustering', 'false');
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ─── clear() ────────────────────────────────────────────────────────────────
  describe('clear()', () => {
    it('should force a DB re-fetch for ALL keys after clear()', async () => {
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'any',
        value: 'val',
      });

      await service.get('key-1', 'fallback');
      await service.get('key-2', 'fallback');
      // 2 DB calls so far
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(2);

      service.clear();

      // After clear, all keys need re-fetching
      await service.get('key-1', 'fallback');
      await service.get('key-2', 'fallback');
      expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledTimes(4);
    });
  });
});
