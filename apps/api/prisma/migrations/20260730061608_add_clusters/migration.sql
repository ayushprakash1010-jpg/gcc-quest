-- CreateEnum
CREATE TYPE "ClusterStatus" AS ENUM ('FORMING', 'READY', 'PROCESSED');

-- CreateTable
CREATE TABLE "story_clusters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "theme" VARCHAR(255),
    "synthesis_text" TEXT,
    "article_count" INTEGER NOT NULL DEFAULT 1,
    "status" "ClusterStatus" NOT NULL DEFAULT 'FORMING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_article_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ,

    CONSTRAINT "story_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_clusters_status_idx" ON "story_clusters"("status");

-- CreateIndex
CREATE INDEX "story_clusters_last_article_at_idx" ON "story_clusters"("last_article_at" DESC);

-- CreateIndex
CREATE INDEX "articles_cluster_id_idx" ON "articles"("cluster_id");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "story_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
