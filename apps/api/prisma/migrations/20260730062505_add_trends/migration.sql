-- CreateEnum
CREATE TYPE "TrendType" AS ENUM ('TECHNOLOGY', 'LOCATION', 'CATEGORY');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('DETECTED', 'PROCESSED');

-- AlterTable
ALTER TABLE "content_drafts" ADD COLUMN     "trend_id" UUID;

-- CreateTable
CREATE TABLE "trends" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "TrendType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "article_count" INTEGER NOT NULL DEFAULT 0,
    "status" "TrendStatus" NOT NULL DEFAULT 'DETECTED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trend_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trends_type_idx" ON "trends"("type");

-- CreateIndex
CREATE INDEX "trends_status_idx" ON "trends"("status");

-- CreateIndex
CREATE INDEX "trends_score_idx" ON "trends"("score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "trend_articles_trend_id_article_id_key" ON "trend_articles"("trend_id", "article_id");

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "trends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_articles" ADD CONSTRAINT "trend_articles_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "trends"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_articles" ADD CONSTRAINT "trend_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
