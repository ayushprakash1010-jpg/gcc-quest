-- AlterTable
ALTER TABLE "content_drafts" ADD COLUMN     "cluster_id" UUID,
ALTER COLUMN "article_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "story_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
