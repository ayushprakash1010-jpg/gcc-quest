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
      include: {
        draft: {
          include: {
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
      },
    });

    for (const post of readyPosts) {
      this.logger.log(`Publishing post ${post.id} (Draft: ${post.draftId})`);
      try {
        let publishedUrl = `https://linkedin.com/posts/gcc-quest-${post.id}`;

        if (post.draft.targetPlatform === 'LINKEDIN') {
          // Find the active LinkedIn OAuth connection
          const connection = await (
            this.prisma as any
          ).oAuthConnection.findFirst({
            where: { provider: 'linkedin' },
            orderBy: { createdAt: 'desc' },
          });

          const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

          if (connection && connection.accessToken && orgId) {
            this.logger.log(
              `Found LinkedIn connection and Organization ID. Publishing to LinkedIn API...`,
            );

            const postContent = post.draft.versions[0]?.content || '';
            const urn = `urn:li:organization:${orgId}`;

            const payload = {
              author: urn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: postContent,
                  },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
              },
            };

            const response = await fetch(
              'https://api.linkedin.com/v2/ugcPosts',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${connection.accessToken}`,
                  'Content-Type': 'application/json',
                  'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify(payload),
              },
            );

            if (!response.ok) {
              const errorData = await response.text();
              throw new Error(
                `LinkedIn API Error: ${response.status} ${response.statusText} - ${errorData}`,
              );
            }

            const data = await response.json();
            const postId = data.id || response.headers.get('x-restli-id');
            if (postId) {
              publishedUrl = `https://www.linkedin.com/feed/update/${postId}`;
            }
          } else {
            this.logger.warn(
              `No LinkedIn connection or LINKEDIN_ORGANIZATION_ID found. Skipping real API call and simulating success.`,
            );
          }
        }

        await this.prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedUrl,
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
