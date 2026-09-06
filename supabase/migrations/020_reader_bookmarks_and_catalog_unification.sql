-- ============================================================================
-- Migration 020: Reader Bookmarks Schema & Notification Source Deduplication
-- ============================================================================
-- Safety: Forward-only, idempotent, zero destructive operations (NO DROP TABLE,
-- NO TRUNCATE, NO bulk DELETE). Preserves all existing purchases, balances,
-- reading progress, and works.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.reading_bookmarks
-- ----------------------------------------------------------------------------
-- Allows readers to bookmark an exact location (chapter, page, text anchor)
-- within a work. Strictly enforces 1 bookmark per user per work.
CREATE TABLE IF NOT EXISTS public.reading_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1 CHECK (page_number >= 1),
  progress_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  text_anchor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reading_bookmarks_user_work UNIQUE (user_id, work_id)
);

-- Indexes for lightning fast lookups and library queries
CREATE INDEX IF NOT EXISTS idx_reading_bookmarks_user_work
  ON public.reading_bookmarks (user_id, work_id);

CREATE INDEX IF NOT EXISTS idx_reading_bookmarks_user_updated
  ON public.reading_bookmarks (user_id, updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reading_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure idempotency
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.reading_bookmarks;
  DROP POLICY IF EXISTS "Users can insert own bookmarks" ON public.reading_bookmarks;
  DROP POLICY IF EXISTS "Users can update own bookmarks" ON public.reading_bookmarks;
  DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.reading_bookmarks;
END $$;

-- Strict RLS Policies: users can only manage their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.reading_bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON public.reading_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
  ON public.reading_bookmarks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.reading_bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Notification Source Tracking & Deduplication
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.in_site_notifications') IS NOT NULL THEN
    ALTER TABLE public.in_site_notifications
      ADD COLUMN IF NOT EXISTS source_type TEXT,
      ADD COLUMN IF NOT EXISTS source_id TEXT;

    -- Partial unique index to prevent duplicate alerts for the same source entity
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'in_site_notifications'
        AND indexname = 'idx_in_site_notifications_dedup'
    ) THEN
      CREATE UNIQUE INDEX idx_in_site_notifications_dedup
        ON public.in_site_notifications (user_id, source_type, source_id)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Profile Notification Preferences
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS notification_preferences JSONB
      DEFAULT '{"email_marketing": false, "in_site_news": true, "promotions": true}'::jsonb;
  END IF;
END $$;


