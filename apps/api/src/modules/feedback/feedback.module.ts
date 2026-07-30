import { Module, Global } from '@nestjs/common';
import { FeedbackRepository } from './infrastructure/feedback.repository';
import { FeedbackService } from './application/feedback.service';
import { FeedbackController } from './presentation/feedback.controller';

@Global()
@Module({
  controllers: [FeedbackController],
  providers: [FeedbackRepository, FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
