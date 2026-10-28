-- Add custom_image_url column to content_drafts for user image overrides
ALTER TABLE "content_drafts" ADD COLUMN IF NOT EXISTS "custom_image_url" TEXT;

