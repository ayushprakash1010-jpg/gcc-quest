import { Module, Global } from '@nestjs/common';
import { PromptService } from './infrastructure/prompt.service';
import { PromptsController } from './presentation/prompts.controller';

@Global()
@Module({
  controllers: [PromptsController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptsModule {}
