import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
      // Self-healing migration: Ensure publishing_channel column exists on scheduled_posts (no manual shell needed)
      await this.$executeRawUnsafe(
        'ALTER TABLE "scheduled_posts" ADD COLUMN IF NOT EXISTS "publishing_channel" VARCHAR(50) NOT NULL DEFAULT \'personal\';',
      ).catch((err) => {
        this.logger.warn(
          `Auto-migration for publishing_channel: ${err.message}`,
        );
      });
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
