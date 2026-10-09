-- CreateTable
CREATE TABLE "content_topics" (
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
CREATE INDEX "content_drafts_topic_id_idx" ON "content_drafts"("topic_id");

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "content_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "oauth_connections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_connections_provider_provider_account_id_key" ON "oauth_connections"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_connections_user_id_provider_key" ON "oauth_connections"("user_id", "provider");

-- AddForeignKey
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
