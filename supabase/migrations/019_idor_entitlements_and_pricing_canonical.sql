-- ============================================================================
-- Migration 019: IDOR Hardening, Permanent Entitlements, Canonical Pricing,
--               Notification Backfill & Revision Normalization
-- ============================================================================
-- Safety: Forward-only, idempotent, zero destructive actions (NO DROP, NO TRUNCATE,
-- NO bulk DELETE, preserves all historical balances, purchases, and ledger entries).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Canonical Pricing Normalization for "Bekatdagi soat"
-- ----------------------------------------------------------------------------
-- Resolves the pricing contradiction (was displaying both 15,000 UZS full book
-- and 3,000 UZS chapter 2). Normalizes to per_chapter model.
UPDATE public.works
SET access_type = 'paid_by_chapter',
    full_work_price = 0,
    updated_at = NOW()
WHERE id = 'c1b24b65-34d5-4612-ba9c-ec2f0fb61850'
   OR slug = 'bekatdagi-soat';

-- Ensure Bekatdagi soat chapters have canonical chapter pricing:
-- Chapter 1: Free (0 UZS)
-- Chapter 2: Paid (3,000 UZS)
-- Chapter 3: Free (0 UZS)
UPDATE public.chapters
SET is_free = true,
    price = 0,
    updated_at = NOW()
WHERE work_id IN (
  SELECT id FROM public.works WHERE id = 'c1b24b65-34d5-4612-ba9c-ec2f0fb61850' OR slug = 'bekatdagi-soat'
) AND chapter_number IN (1, 3);

UPDATE public.chapters
SET is_free = false,
    price = 3000,
    updated_at = NOW()
WHERE work_id IN (
  SELECT id FROM public.works WHERE id = 'c1b24b65-34d5-4612-ba9c-ec2f0fb61850' OR slug = 'bekatdagi-soat'
) AND chapter_number = 2;

-- ----------------------------------------------------------------------------
-- 2. Permanent Entitlements Table (Immutable Access Rights)
-- ----------------------------------------------------------------------------
-- Entitlements decouple reading access rights from dynamic book/chapter prices.
-- Once an entitlement is granted (via purchase), it is permanent and cannot be
-- invalidated if the author subsequently raises prices or alters the pricing model.
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  entitlement_type VARCHAR(20) NOT NULL CHECK (entitlement_type IN ('full_work', 'chapter')),
  price_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  pricing_mode_at_purchase VARCHAR(30) DEFAULT 'paid_by_chapter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_work_chapter_entitlement UNIQUE (user_id, work_id, chapter_id, entitlement_type)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_work
  ON public.entitlements (user_id, work_id);

CREATE INDEX IF NOT EXISTS idx_entitlements_user_chapter
  ON public.entitlements (user_id, chapter_id)
  WHERE chapter_id IS NOT NULL;

-- Enable RLS on entitlements
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own entitlements" ON public.entitlements;
CREATE POLICY "Users can read own entitlements"
  ON public.entitlements FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ----------------------------------------------------------------------------
-- 3. Idempotent Backfill into Entitlements from Existing Purchases
-- ----------------------------------------------------------------------------
-- Captures all historical success statuses ('active', 'completed', 'paid').
-- Guarantees the test user's 3,000 UZS purchase of Chapter 2 is permanently registered.
INSERT INTO public.entitlements (
  user_id,
  work_id,
  chapter_id,
  entitlement_type,
  price_paid,
  purchase_id,
  pricing_mode_at_purchase,
  created_at
)
SELECT
  p.buyer_id,
  p.work_id,
  p.chapter_id,
  CASE WHEN p.purchase_type = 'full_work' THEN 'full_work' ELSE 'chapter' END,
  COALESCE(p.gross_amount, 0),
  p.id,
  'paid_by_chapter',
  p.created_at
FROM public.purchases p
WHERE p.status IN ('active', 'completed', 'paid')
ON CONFLICT (user_id, work_id, chapter_id, entitlement_type) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Hardened Chapter Contents RLS Policy
-- ----------------------------------------------------------------------------
-- Evaluates both entitlements and purchases across all valid success statuses.
-- Strictly prevents unentitled readers from accessing protected text.
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
    -- Condition B: Permanent Entitlement or Purchase across active/completed/paid
    OR (
      auth.uid() IS NOT NULL AND (
        EXISTS (
          SELECT 1 FROM public.chapters c
          JOIN public.entitlements e ON e.user_id = auth.uid()
          WHERE c.id = chapter_contents.chapter_id
            AND (
              (e.entitlement_type = 'full_work' AND e.work_id = c.work_id)
              OR (e.entitlement_type = 'chapter' AND e.chapter_id = c.id)
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.chapters c
          JOIN public.purchases p ON (
            p.buyer_id = auth.uid()
            AND p.status IN ('active', 'completed', 'paid')
            AND (
              (p.purchase_type = 'full_work' AND p.work_id = c.work_id)
              OR (p.purchase_type = 'chapter' AND p.chapter_id = c.id)
            )
          )
          WHERE c.id = chapter_contents.chapter_id
        )
      )
    )
    -- Condition C: Author of the work
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

-- ----------------------------------------------------------------------------
-- 5. IDOR Hardening RLS Policies for Works and Chapters
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authors can update own works" ON public.works;
CREATE POLICY "Authors can update own works"
  ON public.works FOR UPDATE
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Authors can update own chapters" ON public.chapters;
CREATE POLICY "Authors can update own chapters"
  ON public.chapters FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Authors can insert own chapter revisions" ON public.chapter_revisions;
CREATE POLICY "Authors can insert own chapter revisions"
  ON public.chapter_revisions FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authors can insert own work revisions" ON public.work_revisions;
CREATE POLICY "Authors can insert own work revisions"
  ON public.work_revisions FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 6. Safe Normalization of Pending Revisions
-- ----------------------------------------------------------------------------
-- Ensures historical draft or null-status revisions submitted for published works
-- correctly surface in the admin moderation dashboard (/diyoration/tahrirlar).
UPDATE public.work_revisions
SET status = 'pending_review',
    updated_at = NOW()
WHERE status IS NULL OR status = 'draft';

UPDATE public.chapter_revisions
SET status = 'pending_review',
    updated_at = NOW()
WHERE status IS NULL OR status = 'draft';

-- ----------------------------------------------------------------------------
-- 7. Idempotent Backfill for Missing Notifications
-- ----------------------------------------------------------------------------
-- Backfills notifications for past successful purchases so that test users
-- and previous buyers see their purchase events in the navbar bell.
INSERT INTO public.in_site_notifications (user_id, type, title, body, link_url, is_read, created_at)
SELECT
  p.buyer_id,
  'purchase_success',
  'Xaridingiz muvaffaqiyatli yakunlandi',
  '«' || COALESCE(w.title, 'Asar') || '» asari muvaffaqiyatli xarid qilindi.',
  '/asarlar/' || COALESCE(w.slug, p.work_id::text),
  false,
  p.created_at
FROM public.purchases p
JOIN public.works w ON w.id = p.work_id
WHERE p.status IN ('active', 'completed', 'paid')
  AND NOT EXISTS (
    SELECT 1 FROM public.in_site_notifications n
    WHERE n.user_id = p.buyer_id
      AND n.type = 'purchase_success'
      AND n.link_url LIKE '%' || w.slug || '%'
  );

-- Backfills notifications for admin wallet top-ups
INSERT INTO public.in_site_notifications (user_id, type, title, body, link_url, is_read, created_at)
SELECT
  wa.user_id,
  'balance_topup',
  'Hisobingiz to‘ldirildi',
  'Administrator tomonidan balansingizga ' || TO_CHAR(le.amount, 'FM999,999,999') || ' so‘m qo‘shildi.',
  '/kabinet?tab=transactions',
  false,
  le.created_at
FROM public.wallet_ledger_entries le
JOIN public.wallet_accounts wa ON wa.id = le.credit_account_id
WHERE le.entry_type IN ('ADMIN_TOPUP', 'ADMIN_ADJUSTMENT', 'MANUAL_TOPUP')
  AND wa.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.in_site_notifications n
    WHERE n.user_id = wa.user_id
      AND n.type = 'balance_topup'
  );

-- ----------------------------------------------------------------------------
-- 8. Composite Performance Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_purchases_work_status
  ON public.purchases (work_id, status);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_work_status
  ON public.purchases (buyer_id, work_id, status);

CREATE INDEX IF NOT EXISTS idx_in_site_notifications_user_read
  ON public.in_site_notifications (user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Canonical Pricing Constraint on Works (NOT VALID to preserve forward-safety)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_canonical_pricing_modes'
  ) THEN
    ALTER TABLE public.works
    ADD CONSTRAINT check_canonical_pricing_modes
    CHECK (
      (access_type = 'free' AND (full_work_price = 0 OR full_work_price IS NULL))
      OR (access_type = 'paid_by_chapter' AND (full_work_price = 0 OR full_work_price IS NULL))
      OR (access_type IN ('paid_full_work', 'paid_book') AND full_work_price > 0)
    ) NOT VALID;
  END IF;
END $$;
