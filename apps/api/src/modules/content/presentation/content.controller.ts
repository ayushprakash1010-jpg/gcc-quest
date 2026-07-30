import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentRepository } from '../infrastructure/content.repository';
import { FeedbackService } from '../../feedback/application/feedback.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@gcc-quest/shared-types';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(
    private readonly repository: ContentRepository,
    private readonly feedbackService: FeedbackService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get('drafts')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async getDrafts(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
  ) {
    return this.repository.findMany({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 20,
      status,
    });
  }

  @Get('drafts/:id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async getDraft(@Param('id') id: string) {
    return this.repository.findById(id);
  }

  @Post('drafts/:id/versions')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async addVersion(@Param('id') id: string, @Body() body: { content: string }) {
    return this.repository.addVersion(id, body.content, 'USER');
  }

  @Put('drafts/:id/status')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async updateStatus(@Param('id') id: string, @Body() body: { status: any }) {
    const updated = await this.repository.updateStatus(id, body.status);
    if (body.status === 'APPROVED') {
      this.eventEmitter.emit('draft.approved', { draftId: id });
    }
    return updated;
  }

  @Post('drafts/:id/feedback')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  async captureFeedback(
    @Param('id') id: string,
    @Body() body: { originalText: string; editedText: string },
  ) {
    const draft = await this.repository.findById(id);
    return this.feedbackService.captureFeedback(
      body.originalText,
      body.editedText,
      draft.targetPlatform,
      id,
    );
  }
}
