import { Test, TestingModule } from '@nestjs/testing';
import { WebAdapter } from './web.adapter';
import { SsrfGuardService } from '../../../../common/security/ssrf-guard.service';
import { BadRequestException } from '@nestjs/common';

describe('WebAdapter', () => {
  let adapter: WebAdapter;
  let ssrfGuard: SsrfGuardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebAdapter, SsrfGuardService],
    }).compile();

    adapter = module.get<WebAdapter>(WebAdapter);
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

    await expect(adapter.fetch('http://169.254.169.254/')).rejects.toThrow(
      BadRequestException,
    );
    expect(spy).toHaveBeenCalledWith('http://169.254.169.254/');
  });

  it('should return non-empty text for a real static URL', async () => {
    const result = await adapter.fetch('https://example.com/');
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('rawText');
      expect(result[0].rawText?.length).toBeGreaterThan(0);
    }
  });
});
