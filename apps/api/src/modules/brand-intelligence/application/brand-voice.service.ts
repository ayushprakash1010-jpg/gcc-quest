import { Injectable } from '@nestjs/common';
import { BrandVoiceRepository } from '../infrastructure/brand-voice.repository';

@Injectable()
export class BrandVoiceService {
  constructor(private readonly repository: BrandVoiceRepository) {}

  async getDefault() {
    return this.repository.findDefault();
  }

  buildPromptSection(brandVoice: any): string {
    if (!brandVoice) return '';
    return `
BRAND VOICE CONFIGURATION:
Tone: ${brandVoice.tone}
Guidelines:
${brandVoice.guidelines?.map((g: string) => `- ${g}`).join('\n') || '- None'}
`;
  }
}
