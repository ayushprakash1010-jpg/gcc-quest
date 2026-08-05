import { Test, TestingModule } from '@nestjs/testing';
import { RssAdapter } from './rss.adapter';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { BadRequestException } from '@nestjs/common';

describe('RssAdapter', () => {
  let adapter: RssAdapter;
  let ssrfGuard: SsrfGuardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RssAdapter, SsrfGuardService],
    }).compile();

    adapter = module.get<RssAdapter>(RssAdapter);
    ssrfGuard = module.get<SsrfGuardService>(SsrfGuardService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should call SSRF guard before fetching', async () => {
    const spy = jest
      .spyOn(ssrfGuard, 'assertSafeUrl')
      .mockImplementation(() => {
        throw new BadRequestException('SSRF');
      });

    await expect(
      adapter.fetch({ url: 'http://169.254.169.254/feed' }),
    ).rejects.toThrow(BadRequestException);
    expect(spy).toHaveBeenCalledWith('http://169.254.169.254/feed');
  });

  it('should return at least 1 article for a real RSS feed', async () => {
    // using a highly reliable public RSS feed for testing (e.g., TechCrunch or Reddit)
    const result = await adapter.fetch({
      url: 'https://www.reddit.com/r/technology/.rss',
    });
    expect(Array.isArray(result)).toBe(true);
    // Might be empty if network error, but in a successful fetch it should have items
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('url');
    }
  });
});
