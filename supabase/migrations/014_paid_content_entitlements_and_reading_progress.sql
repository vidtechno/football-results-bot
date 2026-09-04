-- ============================================================================
-- Migration: 014_paid_content_entitlements_and_reading_progress.sql
-- Description:
-- 1. Create reading_progress table for persistent reader position with strict RLS.
-- 2. Harden permanent purchase entitlements and unique active constraints.
-- 3. Ensure price-change immunity: access strictly validates entitlement, not current price.
-- 4. Update chapter_contents RLS to seal direct Supabase client access for unauthorized users.
--
-- Forward-only migration. Do NOT edit earlier migrations.
-- Do NOT execute this migration automatically on production.
-- ============================================================================

-- 1. READING PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_index INT NOT NULL DEFAULT 1 CHECK (page_index >= 1),
  total_pages INT NOT NULL DEFAULT 1 CHECK (total_pages >= 1),
  paragraph_offset INT NOT NULL DEFAULT 0 CHECK (paragraph_offset >= 0),
  percentage INT NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_reading_progress_user_work UNIQUE (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_read ON public.reading_progress(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_chapter ON public.reading_progress(user_id, chapter_id);

-- Enable RLS on reading_progress
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reading progress" ON public.reading_progress;
CREATE POLICY "Users can view own reading progress"
  ON public.reading_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.reading_progress;
CREATE POLICY "Users can insert own reading progress"
  ON public.reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reading progress" ON public.reading_progress;
CREATE POLICY "Users can update own reading progress"
  ON public.reading_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reading progress" ON public.reading_progress;
CREATE POLICY "Users can delete own reading progress"
  ON public.reading_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 2. HARDEN PURCHASES ACTIVE ENTITLEMENT CONSTRAINTS
-- Prevents duplicate charges and ensures active entitlements are unique per reader/item
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_buyer_chapter_active
  ON public.purchases (buyer_id, chapter_id)
  WHERE status = 'active' AND purchase_type = 'chapter';

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_buyer_full_work_active
  ON public.purchases (buyer_id, work_id)
  WHERE status = 'active' AND purchase_type = 'full_work';

-- 3. ENSURE CHAPTER CONTENTS RLS POLICY SEALS ALL LEAKS
ALTER TABLE public.chapter_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read chapter content if free, purchased, author, or admin" ON public.chapter_contents;
CREATE POLICY "Read chapter content if free, purchased, author, or admin"
  ON public.chapter_contents FOR SELECT
  USING (
    -- Condition A: Free chapter of published work
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.works w ON w.id = c.work_id
      WHERE c.id = chapter_contents.chapter_id
        AND c.is_free = true
        AND c.status = 'published'
        AND w.status = 'published'
    )
    -- Condition B: Authenticated reader with permanent active purchase entitlement
    -- (Immune to subsequent price increases/decreases!)
    OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chapters c
        JOIN public.purchases p ON (
          p.buyer_id = auth.uid()
          AND p.status = 'active'
          AND (
            (p.purchase_type = 'chapter' AND p.chapter_id = c.id)
            OR (p.purchase_type = 'full_work' AND p.work_id = c.work_id)
          )
        )
        WHERE c.id = chapter_contents.chapter_id
          AND c.status = 'published'
      )
    )
    -- Condition C: Author of the work (preview and editing)
    OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chapters c
        JOIN public.works w ON w.id = c.work_id
        WHERE c.id = chapter_contents.chapter_id
          AND w.author_id = auth.uid()
      )
    )
    -- Condition D: Platform Administrator
    OR (
      auth.uid() IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );
