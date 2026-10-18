-- AlterTable
ALTER TABLE "scheduled_posts" ADD COLUMN IF NOT EXISTS "publishing_channel" VARCHAR(50) NOT NULL DEFAULT 'personal';
