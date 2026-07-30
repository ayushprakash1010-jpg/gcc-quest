import { Global, Module } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider';

@Global()
@Module({
  providers: [GeminiProvider],
  exports: [GeminiProvider],
})
export class LlmModule {}
