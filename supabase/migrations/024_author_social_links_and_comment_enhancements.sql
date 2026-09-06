-- ============================================================================
-- Migration 024: Author Social Links, Comment Enhancements & Post Extensions
-- ============================================================================
-- Description:
-- 1. Add pinned column to author_posts if not exists
-- 2. Add is_edited and edited_at columns to chapter_comments
-- 3. Add social_links JSONB column to profiles
-- 4. Safe idempotent policies and indexing
--
-- Safety:
-- Forward-only, idempotent, non-destructive. Uses IF NOT EXISTS.
-- Preserves all existing records, purchases, balances, and comments.
-- ============================================================================

-- 1. Author posts pinned column
DO $$ BEGIN
  IF to_regclass('public.author_posts') IS NOT NULL THEN
    ALTER TABLE public.author_posts
      ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_author_posts_pinned_date
  ON public.author_posts(author_id, pinned DESC, created_at DESC);

-- 2. Chapter comments editing columns
DO $$ BEGIN
  IF to_regclass('public.chapter_comments') IS NOT NULL THEN
    ALTER TABLE public.chapter_comments
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Profiles social links
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Verify UPDATE policy on chapter_comments for editing
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own comments" ON public.chapter_comments;
  CREATE POLICY "Users can update own comments" ON public.chapter_comments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Verify author_posts management policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authors can manage own posts" ON public.author_posts;
  CREATE POLICY "Authors can manage own posts" ON public.author_posts
    FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
