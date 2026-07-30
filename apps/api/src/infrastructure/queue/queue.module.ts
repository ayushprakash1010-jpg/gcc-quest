import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from './queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import * as basicAuth from 'express-basic-auth';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) throw new Error('REDIS_URL is not defined');

        const parsedUrl = new URL(redisUrl);

        return {
          connection: {
            host: parsedUrl.hostname,
            port: Number(parsedUrl.port),
            password: parsedUrl.password || undefined,
            username: parsedUrl.username || undefined,
            tls: redisUrl.startsWith('rediss://')
              ? { rejectUnauthorized: false }
              : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.CRAWL },
      { name: QUEUES.ANALYSIS },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.GENERATION },
      { name: QUEUES.CLUSTER },
      { name: QUEUES.TREND },
      { name: QUEUES.FEEDBACK },
      { name: QUEUES.NOTIFICATION },
    ),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: QUEUES.CRAWL, adapter: BullMQAdapter },
      { name: QUEUES.ANALYSIS, adapter: BullMQAdapter },
      { name: QUEUES.EMBEDDING, adapter: BullMQAdapter },
      { name: QUEUES.GENERATION, adapter: BullMQAdapter },
      { name: QUEUES.CLUSTER, adapter: BullMQAdapter },
      { name: QUEUES.TREND, adapter: BullMQAdapter },
      { name: QUEUES.FEEDBACK, adapter: BullMQAdapter },
      { name: QUEUES.NOTIFICATION, adapter: BullMQAdapter },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule implements NestModule {
  constructor(private readonly config: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    const user = this.config.get<string>('BULL_BOARD_USERNAME') || 'admin';
    const pass = this.config.get<string>('BULL_BOARD_PASSWORD') || 'admin';

    consumer
      .apply(
        basicAuth({
          users: { [user]: pass },
          challenge: true,
          realm: 'Queue Dashboard',
        }),
      )
      .forRoutes('/admin/queues*');
  }
}
