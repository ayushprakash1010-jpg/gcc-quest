import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ObservabilityService } from '../../observability/observability.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PublisherCron {
  private readonly logger = new Logger(PublisherCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Checking for posts to publish...');

    const now = new Date();
    const readyPosts = await this.prisma.scheduledPost.findMany({
      where: {
        status: 'QUEUED',
        scheduledFor: { lte: now },
      },
      include: { draft: true },
    });

    for (const post of readyPosts) {
      this.logger.log(`Publishing post ${post.id} (Draft: ${post.draftId})`);
      try {
        // Here we would call external platform API (LinkedIn, Twitter, etc.)
        // For MVP, we simulate success
        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedUrl: `https://linkedin.com/posts/gcc-quest-${post.id}`,
          },
        });

        await this.prisma.contentDraft.update({
          where: { id: post.draftId },
          data: { status: 'PUBLISHED' },
        });

        // Track analytics
        this.logger.log(
          `Analytics: post.published - Draft: ${post.draftId}, Platform: ${post.draft.targetPlatform}`,
        );

        this.eventEmitter.emit('post.published', { scheduledPostId: post.id });
      } catch (err: any) {
        this.logger.error(`Failed to publish post ${post.id}: ${err.message}`);
        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            errorMessage: err.message,
          },
        });
      }
    }
  }
}
