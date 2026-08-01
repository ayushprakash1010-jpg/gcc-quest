import { Injectable, Logger } from '@nestjs/common';
import { FeedbackRepository } from '../infrastructure/feedback.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '@gcc-quest/shared-types';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly repository: FeedbackRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async captureFeedback(
    originalText: string,
    editedText: string,
    category?: string,
    draftId?: string,
  ) {
    // Basic diff checking could go here, but for now we just store it
    const feedback = await this.repository.create({
      originalText,
      editedText,
      category,
      draftId,
      diffSummary: 'User manual edit', // Later: use AI to summarize the diff
    });

    this.logger.log(`Feedback captured: ${feedback.id}`);
    this.eventEmitter.emit(DomainEvents.FEEDBACK_CAPTURED, {
      feedbackId: feedback.id,
    });

    return feedback;
  }

  async getFeedbackContext(
    category?: string,
    limit: number = 3,
  ): Promise<string> {
    const examples = await this.repository.findMany({ category, take: limit });

    if (examples.length === 0) return '';

    let context = 'LEARN FROM THESE PAST CORRECTIONS:\n\n';
    examples.forEach((ex: any, i: number) => {
      context += `Example ${i + 1}:\n`;
      context += `Original (Do not do this): ${ex.originalText}\n`;
      context += `Correction (Do this instead): ${ex.editedText}\n`;
      if (ex.diffSummary) context += `Why: ${ex.diffSummary}\n`;
      context += '\n';
    });

    return context.trim();
  }
}
