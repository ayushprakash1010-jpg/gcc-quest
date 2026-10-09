-- CreateTable
CREATE TABLE IF NOT EXISTS "content_topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_topics_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "content_drafts" ADD COLUMN "topic_id" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_drafts_topic_id_idx" ON "content_drafts"("topic_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_drafts_topic_id_fkey') THEN
        ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "content_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
