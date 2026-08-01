import { Test, TestingModule } from '@nestjs/testing';
import { SsrfGuardService } from './ssrf-guard.service';
import { BadRequestException } from '@nestjs/common';

describe('SsrfGuardService', () => {
  let service: SsrfGuardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SsrfGuardService],
    }).compile();

    service = module.get<SsrfGuardService>(SsrfGuardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assertSafeUrl', () => {
    it('throws BadRequestException on 169.254.169.254 (AWS metadata)', () => {
      expect(() => service.assertSafeUrl('http://169.254.169.254/')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException on 10.0.0.1 (Internal IP)', () => {
      expect(() => service.assertSafeUrl('http://10.0.0.1/')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException on localhost', () => {
      expect(() => service.assertSafeUrl('http://localhost:3000')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for ftp protocol', () => {
      expect(() => service.assertSafeUrl('ftp://example.com')).toThrow(
        BadRequestException,
      );
    });

    it('passes for a valid external URL (HTTPS)', () => {
      expect(() => service.assertSafeUrl('https://nasscom.in/')).not.toThrow();
    });

    it('passes for a valid external URL (HTTP)', () => {
      expect(() => service.assertSafeUrl('http://example.com/')).not.toThrow();
    });

    it('throws BadRequestException for loopback IP', () => {
      expect(() => service.assertSafeUrl('http://127.0.0.1/')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for IPv6 loopback', () => {
      expect(() => service.assertSafeUrl('http://[::1]/')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for invalid URL string', () => {
      expect(() => service.assertSafeUrl('not-a-url')).toThrow(
        BadRequestException,
      );
    });
  });
});
