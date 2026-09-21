-- AlterTable: Add image_url column to articles table
-- This is a non-destructive change. Existing rows will have NULL for this column.
ALTER TABLE "articles" ADD COLUMN "image_url" TEXT;
