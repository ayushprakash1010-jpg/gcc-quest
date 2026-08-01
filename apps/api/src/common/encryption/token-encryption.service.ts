import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Encrypts and decrypts OAuth tokens at rest using AES-256-GCM.
 *
 * Storage format (all hex, colon-delimited):
 *   <12-byte IV>:<16-byte GCM auth tag>:<ciphertext>
 *
 * The IV is randomly generated per encryption, so identical tokens
 * produce different ciphertext each time (semantic security).
 *
 * Required env var: OAUTH_TOKEN_ENCRYPTION_KEY
 *   — a 64-character hex string representing 32 random bytes.
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
@Injectable()
export class TokenEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(TokenEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private key: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const keyHex = this.config.get<string>('OAUTH_TOKEN_ENCRYPTION_KEY');

    if (!keyHex) {
      throw new Error(
        'OAUTH_TOKEN_ENCRYPTION_KEY is not set. ' +
          "Run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
          'and add it to your .env file.',
      );
    }

    if (keyHex.length !== 64) {
      throw new Error(
        `OAUTH_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ` +
          `Got ${keyHex.length} characters.`,
      );
    }

    this.key = Buffer.from(keyHex, 'hex');
    this.logger.log('Token encryption service initialized (AES-256-GCM)');
  }

  /**
   * Encrypts a plaintext token.
   * Returns a string in format: <ivHex>:<authTagHex>:<ciphertextHex>
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV — optimal for GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag(); // 128-bit authentication tag

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  /**
   * Decrypts a token previously encrypted with encrypt().
   * Throws if the ciphertext has been tampered with (GCM integrity check).
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted token format. Expected <iv>:<authTag>:<ciphertext>.',
      );
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /**
   * Detects whether a stored token is in our encrypted format or plaintext.
   * Used during the one-time migration to avoid double-encrypting.
   *
   * Heuristic: encrypted tokens have 3 colon-delimited hex segments.
   * Plaintext LinkedIn tokens are Bearer tokens that never match this.
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    const parts = value.split(':');
    // IV = 24 hex chars (12 bytes), authTag = 32 hex chars (16 bytes)
    return (
      parts.length === 3 &&
      parts[0].length === 24 &&
      parts[1].length === 32 &&
      /^[0-9a-f]+$/i.test(parts[0])
    );
  }
}
