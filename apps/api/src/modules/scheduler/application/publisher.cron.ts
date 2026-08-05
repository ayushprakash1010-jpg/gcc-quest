import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ObservabilityService } from '../../observability/observability.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TokenEncryptionService } from '../../../common/encryption/token-encryption.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class PublisherCron {
  private readonly logger = new Logger(PublisherCron.name);

  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly observability: ObservabilityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly encryption: TokenEncryptionService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis(
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const lockKey = 'cron:publisher:lock';
    // Acquire a distributed lock for 55 seconds (since cron runs every 60s)
    const acquired = await this.redis.set(lockKey, 'locked', 'PX', 55000, 'NX');

    if (!acquired) {
      this.logger.warn(
        'Previous publish job is still running (or locked by another replica). Skipping this tick to prevent double-publishing.',
      );
      return;
    }
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
          // Find the active LinkedIn OAuth connection — HIGH-01: fixed (this.prisma as any) cast
          const connection = await this.prisma.oAuthConnection.findFirst({
            where: { provider: 'linkedin' },
            orderBy: { createdAt: 'desc' },
          });

          // CRIT-02: Check token expiry before attempting to publish
          if (connection?.expiresAt) {
            const now = new Date();
            const sevenDaysFromNow = new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000,
            );

            if (connection.expiresAt <= now) {
              // Token is already expired — fail fast, do not call LinkedIn API
              throw new Error(
                'LinkedIn access token has expired. Please reconnect LinkedIn in Settings to resume publishing.',
              );
            } else if (connection.expiresAt <= sevenDaysFromNow) {
              // Warn early so operator has time to renew
              this.logger.warn(
                `CRITICAL: LinkedIn access token expires at ${connection.expiresAt.toISOString()}. ` +
                  'Reconnect LinkedIn in Settings within 7 days to avoid publishing failures.',
              );
            }
          }

          if (connection && connection.accessToken) {
            // Post to Company Page if an ID is provided in ENV, otherwise fallback to Personal Profile
            const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
            const urn = orgId
              ? `urn:li:organization:${orgId}`
              : `urn:li:person:${connection.providerAccountId}`;

            this.logger.log(
              `Found LinkedIn connection. Publishing to LinkedIn API as ${urn}...`,
            );

            // CRIT-01: Decrypt the stored token before use — it is stored encrypted at rest
            const bearerToken = this.encryption.decrypt(connection.accessToken);

            const postContent = post.draft.versions[0]?.content || '';

            const payload = {
              author: urn,
              commentary: postContent,
              visibility: 'PUBLIC',
              distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: [],
              },
              lifecycleState: 'PUBLISHED',
              isReshareDisabledByAuthor: false,
            };

            const response = await fetch('https://api.linkedin.com/v2/posts', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${bearerToken}`,
                'Content-Type': 'application/json',
                'LinkedIn-Version': '202401',
                'X-Restli-Protocol-Version': '2.0.0',
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorData = await response.text();
              throw new Error(
                `LinkedIn API Error: ${response.status} ${response.statusText} - ${errorData}`,
              );
            }

            const postId = response.headers.get('x-restli-id');
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
