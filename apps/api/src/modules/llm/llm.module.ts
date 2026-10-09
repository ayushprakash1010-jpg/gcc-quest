import { Global, Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LlmService } from './llm.service';

@Global()
@Module({
  providers: [GeminiProvider, OpenAiProvider, LlmService],
  exports: [GeminiProvider, OpenAiProvider, LlmService],
})
export class LlmModule {}
