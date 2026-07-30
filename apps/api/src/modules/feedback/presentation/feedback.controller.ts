import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeedbackService } from '../application/feedback.service';
import { FeedbackRepository } from '../infrastructure/feedback.repository';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';

@Controller('api/v1/feedback')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly repository: FeedbackRepository,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async getFeedbacks(@Query('category') category?: string) {
    return this.repository.findMany({ category, take: 50 });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async captureFeedback(
    @Body()
    body: {
      originalText: string;
      editedText: string;
      category?: string;
      draftId?: string;
    },
  ) {
    return this.feedbackService.captureFeedback(
      body.originalText,
      body.editedText,
      body.category,
      body.draftId,
    );
  }
}
