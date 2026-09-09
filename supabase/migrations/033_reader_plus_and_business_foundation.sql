-- Manbora Reader Plus, gamification and business foundation.
-- Forward-only: preserves purchases and historical chapter entitlements.

ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS is_preview_free BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE public.chapters c SET is_preview_free = TRUE
WHERE c.is_free = TRUE AND EXISTS (SELECT 1 FROM public.works w WHERE w.id=c.work_id AND w.access_type='paid_full_work');

CREATE TABLE IF NOT EXISTS public.reading_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1 CHECK (page_number > 0),
  quote TEXT NOT NULL CHECK (char_length(quote) BETWEEN 1 AND 2000),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 4000),
  color VARCHAR(12) NOT NULL DEFAULT 'yellow' CHECK (color IN ('yellow','green','blue','pink')),
  start_offset INTEGER NOT NULL DEFAULT 0 CHECK (start_offset >= 0),
  end_offset INTEGER NOT NULL DEFAULT 0 CHECK (end_offset >= start_offset),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_annotations_user_updated ON public.reading_annotations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_annotations_chapter ON public.reading_annotations(user_id, chapter_id, page_number);
ALTER TABLE public.reading_annotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers manage own annotations" ON public.reading_annotations;
CREATE POLICY "Readers manage own annotations" ON public.reading_annotations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reading_daily_activity (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_seconds INTEGER NOT NULL DEFAULT 0 CHECK (active_seconds >= 0),
  pages_read INTEGER NOT NULL DEFAULT 0 CHECK (pages_read >= 0),
  chapters_completed INTEGER NOT NULL DEFAULT 0 CHECK (chapters_completed >= 0),
  books_completed INTEGER NOT NULL DEFAULT 0 CHECK (books_completed >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_date)
);
CREATE INDEX IF NOT EXISTS idx_reading_activity_user_date ON public.reading_daily_activity(user_id, activity_date DESC);
ALTER TABLE public.reading_daily_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own daily activity" ON public.reading_daily_activity;
CREATE POLICY "Readers view own daily activity" ON public.reading_daily_activity FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reader_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_key)
);
ALTER TABLE public.reader_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own achievements" ON public.reader_achievements;
CREATE POLICY "Readers view own achievements" ON public.reader_achievements FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.chapter_read_milestones (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  milestone SMALLINT NOT NULL CHECK (milestone IN (25,50,75,100)),
  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chapter_id, milestone)
);
CREATE INDEX IF NOT EXISTS idx_read_milestones_work ON public.chapter_read_milestones(work_id, chapter_id, milestone);
ALTER TABLE public.chapter_read_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own milestones" ON public.chapter_read_milestones;
CREATE POLICY "Readers view own milestones" ON public.chapter_read_milestones FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.work_read_completions (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, work_id)
);
ALTER TABLE public.work_read_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own completions" ON public.work_read_completions;
CREATE POLICY "Readers view own completions" ON public.work_read_completions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID REFERENCES public.works(id) ON DELETE CASCADE,
  discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value BIGINT NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active_code ON public.promo_codes(code) WHERE is_active = TRUE;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (promo_id, user_id, purchase_id)
);
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own promo uses" ON public.promo_redemptions;
CREATE POLICY "Readers view own promo uses" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.author_subscription_plans (
  author_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_price BIGINT NOT NULL CHECK (monthly_price >= 1000),
  title VARCHAR(100) NOT NULL DEFAULT 'Muallif obunasi',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  include_future_works BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.author_subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads active subscription plans" ON public.author_subscription_plans;
CREATE POLICY "Public reads active subscription plans" ON public.author_subscription_plans FOR SELECT
  USING (is_active OR auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.author_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  price_paid BIGINT NOT NULL CHECK (price_paid >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscriber_id, author_id, current_period_start)
);
CREATE INDEX IF NOT EXISTS idx_author_subscriptions_access ON public.author_subscriptions(subscriber_id, author_id, status, current_period_end);
ALTER TABLE public.author_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view relevant subscriptions" ON public.author_subscriptions;
CREATE POLICY "Users view relevant subscriptions" ON public.author_subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.financial_risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  risk_type VARCHAR(60) NOT NULL,
  risk_score SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_financial_risk_open ON public.financial_risk_events(status, risk_score DESC, created_at DESC);
ALTER TABLE public.financial_risk_events ENABLE ROW LEVEL SECURITY;

-- Canonical pricing: one work price, with author-selected free preview chapters.
-- Historical chapter purchases and entitlements remain intact.
UPDATE public.works w
SET full_work_price = GREATEST(
      COALESCE(w.full_work_price, 0),
      COALESCE((SELECT SUM(GREATEST(c.price, 0)) FROM public.chapters c WHERE c.work_id = w.id AND c.is_free = FALSE), 0)
    ),
    access_type = 'paid_full_work',
    updated_at = NOW()
WHERE w.access_type = 'paid_by_chapter';

UPDATE public.chapters c
SET price = 0, is_free = CASE WHEN EXISTS (SELECT 1 FROM public.works w2 WHERE w2.id=c.work_id AND w2.access_type='free') THEN TRUE ELSE FALSE END, updated_at = NOW()
WHERE price <> 0
  AND EXISTS (SELECT 1 FROM public.works w WHERE w.id = c.work_id AND w.access_type = 'paid_full_work');

-- Prior chapter payments count toward ownership: fully paid readers get permanent full-work access.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_user_full_work
  ON public.entitlements(user_id, work_id)
  WHERE entitlement_type = 'full_work' AND chapter_id IS NULL;

INSERT INTO public.entitlements (user_id, work_id, chapter_id, entitlement_type, price_paid, pricing_mode_at_purchase)
SELECT p.buyer_id, p.work_id, NULL, 'full_work', SUM(p.gross_amount), 'legacy_chapter_credit'
FROM public.purchases p
JOIN public.works w ON w.id = p.work_id AND w.access_type = 'paid_full_work'
WHERE p.status IN ('active','completed','paid')
GROUP BY p.buyer_id, p.work_id, w.full_work_price
HAVING SUM(p.gross_amount) >= w.full_work_price
ON CONFLICT DO NOTHING;

-- One lightweight, atomic call records reading activity, funnel milestones and badges.
-- It is deliberately bounded so a forged client request cannot inflate counters quickly.
CREATE OR REPLACE FUNCTION public.record_reading_activity(
  p_user_id UUID,
  p_work_id UUID,
  p_chapter_id UUID,
  p_percentage INTEGER,
  p_active_seconds INTEGER DEFAULT 0,
  p_page_advanced BOOLEAN DEFAULT FALSE,
  p_book_completed BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Tashkent')::DATE;
  v_percent INTEGER := LEAST(100, GREATEST(0, COALESCE(p_percentage, 0)));
  v_seconds INTEGER := LEAST(90, GREATEST(0, COALESCE(p_active_seconds, 0)));
  v_pages INTEGER := CASE WHEN p_page_advanced THEN 1 ELSE 0 END;
  v_chapter_done INTEGER := 0;
  v_book_done INTEGER := 0;
  v_xp INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Ruxsat yoq';
  END IF;

  IF v_percent >= 100 THEN
    INSERT INTO public.chapter_read_milestones(user_id, work_id, chapter_id, milestone)
    VALUES (p_user_id, p_work_id, p_chapter_id, 100)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_chapter_done = ROW_COUNT;
  END IF;

  INSERT INTO public.chapter_read_milestones(user_id, work_id, chapter_id, milestone)
  SELECT p_user_id, p_work_id, p_chapter_id, m
  FROM unnest(ARRAY[25,50,75]::SMALLINT[]) AS m
  WHERE v_percent >= m
  ON CONFLICT DO NOTHING;

  IF p_book_completed AND v_percent >= 100 THEN
    INSERT INTO public.work_read_completions(user_id, work_id)
    VALUES (p_user_id, p_work_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_book_done = ROW_COUNT;
  END IF;

  v_xp := v_pages * 2 + LEAST(3, v_seconds / 30) + v_chapter_done * 20 + v_book_done * 50;
  INSERT INTO public.reading_daily_activity(
    user_id, activity_date, active_seconds, pages_read, chapters_completed, books_completed, xp, updated_at
  ) VALUES (
    p_user_id, v_today, v_seconds, v_pages, v_chapter_done, v_book_done, v_xp, NOW()
  )
  ON CONFLICT (user_id, activity_date) DO UPDATE SET
    active_seconds = reading_daily_activity.active_seconds + EXCLUDED.active_seconds,
    pages_read = reading_daily_activity.pages_read + EXCLUDED.pages_read,
    chapters_completed = reading_daily_activity.chapters_completed + EXCLUDED.chapters_completed,
    books_completed = reading_daily_activity.books_completed + EXCLUDED.books_completed,
    xp = reading_daily_activity.xp + EXCLUDED.xp,
    updated_at = NOW();

  INSERT INTO public.reader_achievements(user_id, achievement_key)
  SELECT p_user_id, key FROM (VALUES
    ('first_page', EXISTS(SELECT 1 FROM public.reading_daily_activity WHERE user_id=p_user_id AND pages_read > 0)),
    ('first_chapter', EXISTS(SELECT 1 FROM public.chapter_read_milestones WHERE user_id=p_user_id AND milestone=100)),
    ('book_finisher', EXISTS(SELECT 1 FROM public.reading_daily_activity WHERE user_id=p_user_id AND books_completed > 0)),
    ('hundred_pages', (SELECT COALESCE(SUM(pages_read),0) FROM public.reading_daily_activity WHERE user_id=p_user_id) >= 100)
  ) AS badges(key, earned)
  WHERE earned
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('xpAdded', v_xp, 'chapterCompleted', v_chapter_done = 1);
END;
$$;

REVOKE ALL ON FUNCTION public.record_reading_activity(UUID,UUID,UUID,INTEGER,INTEGER,BOOLEAN,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_reading_activity(UUID,UUID,UUID,INTEGER,INTEGER,BOOLEAN,BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.purchase_author_subscription(
  p_subscriber_id UUID, p_author_id UUID, p_idempotency_key TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_plan RECORD; v_reader RECORD; v_author_acc RECORD; v_platform RECORD; v_sub_id UUID;
  v_price BIGINT; v_author_net BIGINT; v_fee BIGINT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_subscriber_id THEN RAISE EXCEPTION 'Ruxsat yoq'; END IF;
  IF p_subscriber_id = p_author_id THEN RAISE EXCEPTION 'Oz profilingizga obuna bololmaysiz'; END IF;
  SELECT * INTO v_plan FROM public.author_subscription_plans WHERE author_id=p_author_id AND is_active=TRUE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Obuna rejasi faol emas'; END IF;
  IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE idempotency_key=p_idempotency_key) THEN
    RETURN jsonb_build_object('success',true,'idempotent',true);
  END IF;
  SELECT * INTO v_reader FROM public.wallet_accounts WHERE user_id=p_subscriber_id AND account_type='reader_credit' FOR UPDATE;
  IF NOT FOUND OR v_reader.balance < v_plan.monthly_price THEN RAISE EXCEPTION 'Balansda mablag yetarli emas'; END IF;
  INSERT INTO public.wallet_accounts(user_id,account_type,balance) VALUES(p_author_id,'author_earnings_available',0) ON CONFLICT(user_id,account_type) DO NOTHING;
  SELECT * INTO v_author_acc FROM public.wallet_accounts WHERE user_id=p_author_id AND account_type='author_earnings_available' FOR UPDATE;
  SELECT * INTO v_platform FROM public.wallet_accounts WHERE account_type='platform_revenue' FOR UPDATE;
  v_price:=v_plan.monthly_price; v_fee:=ROUND(v_price*0.20); v_author_net:=v_price-v_fee;
  UPDATE public.wallet_accounts SET balance=balance-v_price,updated_at=NOW() WHERE id=v_reader.id;
  UPDATE public.wallet_accounts SET balance=balance+v_author_net,updated_at=NOW() WHERE id=v_author_acc.id;
  UPDATE public.wallet_accounts SET balance=balance+v_fee,updated_at=NOW() WHERE id=v_platform.id;
  INSERT INTO public.author_subscriptions(subscriber_id,author_id,current_period_end,price_paid)
  VALUES(p_subscriber_id,p_author_id,NOW()+INTERVAL '30 days',v_price) RETURNING id INTO v_sub_id;
  INSERT INTO public.wallet_transactions(account_id,amount,transaction_type,reference_type,reference_id,idempotency_key,description,actor_id,balance_after) VALUES
    (v_reader.id,-v_price,'purchase_debit','manual',v_sub_id::TEXT,p_idempotency_key,'Muallifga 30 kunlik obuna',p_subscriber_id,v_reader.balance-v_price),
    (v_author_acc.id,v_author_net,'author_sale_credit','manual',v_sub_id::TEXT,p_idempotency_key||'_author','Muallif obunasi daromadi',p_subscriber_id,v_author_acc.balance+v_author_net),
    (v_platform.id,v_fee,'platform_fee_credit','manual',v_sub_id::TEXT,p_idempotency_key||'_fee','Obuna platforma komissiyasi',p_subscriber_id,v_platform.balance+v_fee);
  RETURN jsonb_build_object('success',true,'subscriptionId',v_sub_id,'price',v_price,'periodEnd',NOW()+INTERVAL '30 days');
END; $$;
REVOKE ALL ON FUNCTION public.purchase_author_subscription(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_author_subscription(UUID,UUID,TEXT) TO service_role;
