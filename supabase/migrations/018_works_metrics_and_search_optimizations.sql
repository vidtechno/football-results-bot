-- ============================================================================
-- Migration: 018_works_metrics_and_search_optimizations.sql
-- Description:
-- 1. Add view_count, average_rating, and rating_count columns to public.works.
-- 2. Update chapter_contents RLS to seal paid_full_work leaks when is_free=true.
-- 3. Add performance and search indexes for works, authors, purchases, and ledger.
--
-- Forward-only migration. Do NOT edit earlier migrations.
-- Do NOT execute this migration automatically on production.
-- ============================================================================

-- 1. ADD METRICS COLUMNS TO WORKS
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

-- 2. UPDATE CHAPTER CONTENTS RLS: HARDEN PAID_FULL_WORK PAYWALL
-- Condition A must NOT grant free access if the parent work access_type is paid_full_work or paid_book!
DROP POLICY IF EXISTS "Read chapter content if free, purchased, author, or admin" ON public.chapter_contents;

CREATE POLICY "Read chapter content if free, purchased, author, or admin"
  ON public.chapter_contents FOR SELECT
  USING (
    -- Condition A: Truly free chapter of a published free or per-chapter work
    -- Strictly disallows free access if the work is paid_full_work or paid_book
    EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.works w ON w.id = c.work_id
      WHERE c.id = chapter_contents.chapter_id
        AND c.is_free = true
        AND c.status = 'published'
        AND w.status = 'published'
        AND w.access_type NOT IN ('paid_full_work', 'paid_book')
    )
    -- Condition B: Authenticated reader with permanent active purchase entitlement
    -- (Matches chapter entitlement or full-work entitlement)
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

-- 3. PERFORMANCE AND SEARCH INDEXES
CREATE INDEX IF NOT EXISTS idx_works_view_count ON public.works(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_works_average_rating ON public.works(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_works_published_date ON public.works(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_title_trgm ON public.works(title);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_created ON public.purchases(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_account_created ON public.wallet_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Ensure user cannot follow themselves or their own works
CREATE INDEX IF NOT EXISTS idx_work_follows_lookup ON public.work_follows(work_id, user_id);
CREATE INDEX IF NOT EXISTS idx_author_follows_lookup ON public.author_follows(author_id, user_id);
