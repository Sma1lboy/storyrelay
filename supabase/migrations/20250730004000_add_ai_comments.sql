-- Add AI judge comments column to stories table
-- Stores JSON array of AI-generated reviews with different personalities
ALTER TABLE "public"."stories" ADD COLUMN IF NOT EXISTS "ai_comments" jsonb;

COMMENT ON COLUMN "public"."stories"."ai_comments" IS 'AI-generated story reviews from different judge personalities';
