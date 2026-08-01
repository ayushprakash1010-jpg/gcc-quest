import { Global, Module } from '@nestjs/common';
import { TokenEncryptionService } from './token-encryption.service';
import { SettingsCacheService } from '../cache/settings-cache.service';

/**
 * Global module providing shared infrastructure services:
 * - TokenEncryptionService: AES-256-GCM encryption for OAuth tokens
 * - SettingsCacheService: In-memory cache for SystemSetting DB values (HIGH-06)
 *
 * Marked @Global() so any module can inject these without explicit imports.
 */
@Global()
@Module({
  providers: [TokenEncryptionService, SettingsCacheService],
  exports: [TokenEncryptionService, SettingsCacheService],
})
export class EncryptionModule {}
