import { TokenEncryptionService } from './token-encryption.service';
import { ConfigService } from '@nestjs/config';

/**
 * Unit tests for TokenEncryptionService (AES-256-GCM)
 *
 * These tests run entirely in memory — no NestJS DI container,
 * no database, no external services needed. They validate:
 *   1. Successful round-trip encrypt → decrypt
 *   2. Format detection via isEncrypted()
 *   3. Tamper detection (GCM auth tag integrity)
 *   4. Edge cases (empty string, missing key)
 */
describe('TokenEncryptionService', () => {
  let service: TokenEncryptionService;
  // A deterministic 64-char hex key for tests
  const TEST_KEY = 'a'.repeat(64);

  beforeEach(() => {
    // Create a minimal ConfigService mock that returns the test key
    const mockConfigService = {
      get: jest.fn().mockReturnValue(TEST_KEY),
    } as unknown as ConfigService;

    service = new TokenEncryptionService(mockConfigService);
    // Manually trigger OnModuleInit (NestJS lifecycle hook)
    service.onModuleInit();
  });

  // ─── Encrypt / Decrypt ──────────────────────────────────────────────────────
  describe('encrypt() and decrypt()', () => {
    it('should correctly round-trip a LinkedIn access token', () => {
      const token = 'AQV9abc123LinkedInToken_EXAMPLE';
      const encrypted = service.encrypt(token);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(token);
    });

    it('should correctly round-trip a token containing special characters', () => {
      const token = 'Bearer abc!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = service.encrypt(token);
      expect(service.decrypt(encrypted)).toBe(token);
    });

    it('should produce different ciphertext for the same plaintext (semantic security via random IV)', () => {
      const token = 'same-token-value';
      const enc1 = service.encrypt(token);
      const enc2 = service.encrypt(token);
      // Same plaintext but different IVs → different ciphertext
      expect(enc1).not.toBe(enc2);
      // Both still decrypt correctly
      expect(service.decrypt(enc1)).toBe(token);
      expect(service.decrypt(enc2)).toBe(token);
    });

    it('should correctly round-trip an empty string', () => {
      const token = '';
      const encrypted = service.encrypt(token);
      expect(service.decrypt(encrypted)).toBe(token);
    });

    it('should correctly round-trip a very long token (2048 chars)', () => {
      const token = 'x'.repeat(2048);
      const encrypted = service.encrypt(token);
      expect(service.decrypt(encrypted)).toBe(token);
    });
  });

  // ─── Encrypted Format ───────────────────────────────────────────────────────
  describe('encrypt() output format', () => {
    it('should produce output with exactly 3 colon-delimited segments', () => {
      const encrypted = service.encrypt('some-token');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should produce a 24-character hex IV (12 bytes)', () => {
      const encrypted = service.encrypt('some-token');
      const [iv] = encrypted.split(':');
      expect(iv).toHaveLength(24);
      expect(iv).toMatch(/^[0-9a-f]+$/i);
    });

    it('should produce a 32-character hex auth tag (16 bytes)', () => {
      const encrypted = service.encrypt('some-token');
      const [, authTag] = encrypted.split(':');
      expect(authTag).toHaveLength(32);
      expect(authTag).toMatch(/^[0-9a-f]+$/i);
    });
  });

  // ─── isEncrypted() ──────────────────────────────────────────────────────────
  describe('isEncrypted()', () => {
    it('should return true for a freshly encrypted value', () => {
      const encrypted = service.encrypt('AQV9linkedin_token_value');
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for a raw plaintext LinkedIn bearer token', () => {
      const plaintext = 'AQV9abc123LinkedInAccessToken';
      expect(service.isEncrypted(plaintext)).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for a JWT token (which contains dots not colons)', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';
      expect(service.isEncrypted(jwt)).toBe(false);
    });

    it('should return false for a random 2-segment string', () => {
      expect(service.isEncrypted('aabbcc:ddeeff')).toBe(false);
    });
  });

  // ─── Tamper Detection ───────────────────────────────────────────────────────
  describe('decrypt() tamper detection', () => {
    it('should throw when the ciphertext has been tampered with', () => {
      const encrypted = service.encrypt('original-token');
      const [iv, authTag, ciphertext] = encrypted.split(':');
      // Flip the last character of the ciphertext to simulate tampering
      const tampered =
        ciphertext.slice(0, -1) + (ciphertext.endsWith('a') ? 'b' : 'a');
      const tamperedEncrypted = `${iv}:${authTag}:${tampered}`;
      expect(() => service.decrypt(tamperedEncrypted)).toThrow();
    });

    it('should throw for an invalid format string', () => {
      expect(() => service.decrypt('not-a-valid-format')).toThrow(
        'Invalid encrypted token format',
      );
    });
  });

  // ─── Initialization Guard ───────────────────────────────────────────────────
  describe('onModuleInit() validation', () => {
    it('should throw if OAUTH_TOKEN_ENCRYPTION_KEY is missing', () => {
      const noKeyConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;
      const badService = new TokenEncryptionService(noKeyConfig);
      expect(() => badService.onModuleInit()).toThrow(
        'OAUTH_TOKEN_ENCRYPTION_KEY is not set',
      );
    });

    it('should throw if the key is not 64 hex characters', () => {
      const shortKeyConfig = {
        get: jest.fn().mockReturnValue('tooshort'),
      } as unknown as ConfigService;
      const badService = new TokenEncryptionService(shortKeyConfig);
      expect(() => badService.onModuleInit()).toThrow(
        'OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hex string',
      );
    });
  });
});
