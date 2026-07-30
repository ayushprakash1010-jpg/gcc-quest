-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('RSS', 'WEB', 'SITEMAP');

-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('RESEARCH', 'NEWS', 'COMPANY_BLOG', 'GOVERNMENT', 'EVENT', 'SOCIAL');

-- CreateEnum
CREATE TYPE "CrawlFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DISCOVERED', 'DEDUPLICATED', 'ANALYZED', 'CLUSTERED', 'CONTENT_GENERATED', 'SKIPPED', 'SEMANTIC_DUPLICATE');

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "category" "SourceCategory" NOT NULL,
    "crawl_frequency" "CrawlFrequency" NOT NULL DEFAULT 'DAILY',
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "config" JSONB DEFAULT '{}',
    "last_crawled_at" TIMESTAMPTZ,
    "next_crawl_at" TIMESTAMPTZ,
    "total_articles" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "authority_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "composite_score" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "robots_txt_checked" BOOLEAN NOT NULL DEFAULT false,
    "robots_txt_allowed" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_crawl_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "articles_found" INTEGER NOT NULL DEFAULT 0,
    "articles_new" INTEGER NOT NULL DEFAULT 0,
    "articles_dedup" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "trigger" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "source_crawl_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "external_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "published_at" TIMESTAMPTZ,
    "raw_text" TEXT,
    "content_hash" VARCHAR(64) NOT NULL,
    "word_count" INTEGER,
    "language" VARCHAR(10) DEFAULT 'en',
    "status" "ArticleStatus" NOT NULL DEFAULT 'DISCOVERED',
    "cluster_id" UUID,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sources_url_key" ON "sources"("url");

-- CreateIndex
CREATE INDEX "source_crawl_history_source_id_started_at_idx" ON "source_crawl_history"("source_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "articles_content_hash_key" ON "articles"("content_hash");

-- CreateIndex
CREATE INDEX "articles_source_id_idx" ON "articles"("source_id");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_published_at_idx" ON "articles"("published_at" DESC);

-- CreateIndex
CREATE INDEX "articles_discovered_at_idx" ON "articles"("discovered_at" DESC);

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_crawl_history" ADD CONSTRAINT "source_crawl_history_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
