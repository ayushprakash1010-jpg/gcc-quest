import { Module, Global } from '@nestjs/common';
import { BrandVoiceRepository } from './infrastructure/brand-voice.repository';
import { BrandVoiceService } from './application/brand-voice.service';
import { BrandVoiceController } from './presentation/brand-voice.controller';

@Global()
@Module({
  controllers: [BrandVoiceController],
  providers: [BrandVoiceRepository, BrandVoiceService],
  exports: [BrandVoiceService],
})
export class BrandIntelligenceModule {}
