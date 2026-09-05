-- Migration 017: Reviews, Helpful Votes, Promotions & Discounts, and Reporting System
-- Forward migration for Manbora platform

-- 1. Work Reviews (Taqrizlar va baholar)
CREATE TABLE IF NOT EXISTS public.work_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  contains_spoilers BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_reviews_work_user UNIQUE (work_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_work_reviews_work ON public.work_reviews(work_id, created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_work_reviews_user ON public.work_reviews(user_id);

-- 2. Review Helpful Votes (Foydali taqriz deb ovoz berish)
CREATE TABLE IF NOT EXISTS public.review_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.work_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_review_helpful_votes UNIQUE (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON public.review_helpful_votes(review_id);

-- 3. Promotions & Promo Codes (Chegirmalar va promokodlar)
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  funded_by TEXT NOT NULL CHECK (funded_by IN ('admin', 'author')),
  author_id UUID REFERENCES public.author_profiles(user_id) ON DELETE CASCADE,
  applicable_work_id UUID REFERENCES public.works(id) ON DELETE CASCADE,
  min_order_amount NUMERIC(12,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_code_active ON public.promotions(code, is_active);

-- 4. Promo Redemptions (Qo‘llanilgan promokodlar jurnali)
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES public.works(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_promo_user_redemption UNIQUE (promo_id, user_id)
);

-- 5. User Reports (Foydalanuvchi shikoyatlari)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('work', 'chapter', 'review', 'author')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_target ON public.user_reports(target_type, target_id);

-- Enable RLS
ALTER TABLE public.work_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Policies for Work Reviews
DO $$ BEGIN
  CREATE POLICY "Anyone can view non-hidden reviews" ON public.work_reviews
    FOR SELECT USING (is_hidden = false OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create reviews" ON public.work_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reviews" ON public.work_reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reviews" ON public.work_reviews
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for Helpful Votes
DO $$ BEGIN
  CREATE POLICY "Anyone can view helpful votes" ON public.review_helpful_votes
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can vote helpful" ON public.review_helpful_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can remove their helpful vote" ON public.review_helpful_votes
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for Promotions
DO $$ BEGIN
  CREATE POLICY "Anyone can view active promotions" ON public.promotions
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for Promo Redemptions
DO $$ BEGIN
  CREATE POLICY "Users can view own promo redemptions" ON public.promo_redemptions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Policies for User Reports
DO $$ BEGIN
  CREATE POLICY "Users can view own submitted reports" ON public.user_reports
    FOR SELECT USING (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create reports" ON public.user_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
