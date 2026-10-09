import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { z } from 'zod';
import { LlmOptions } from './providers/gemini.provider';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private provider: 'gemini' | 'openai' = 'gemini';

  constructor(
    private configService: ConfigService,
    private geminiProvider: GeminiProvider,
    private openaiProvider: OpenAiProvider,
  ) {
    this.provider =
      (this.configService.get<string>('PREFERRED_LLM_PROVIDER') as
        'gemini' | 'openai') || 'gemini';
    this.logger.log(`Initialized LlmService with provider: ${this.provider}`);
  }

  async generateStructured<T>(
    prompt: string,
    zodSchema: z.ZodSchema<T>,
    options?: LlmOptions,
  ): Promise<T> {
    if (this.provider === 'openai') {
      return this.openaiProvider.generateStructured(prompt, zodSchema, options);
    }
    return this.geminiProvider.generateStructured(prompt, zodSchema, options);
  }

  async generateText(prompt: string, options?: LlmOptions): Promise<string> {
    if (this.provider === 'openai') {
      return this.openaiProvider.generateText(prompt, options);
    }
    return this.geminiProvider.generateText(prompt, options);
  }

  async embed(text: string): Promise<number[]> {
    // We strictly use Gemini for embeddings as changing models breaks vector search
    return this.geminiProvider.embed(text);
  }
}
