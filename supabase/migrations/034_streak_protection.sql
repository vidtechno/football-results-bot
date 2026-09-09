-- Up to three recoveries per calendar month, paid from earned reading XP.
CREATE TABLE IF NOT EXISTS public.streak_protections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  protected_date DATE NOT NULL,
  xp_cost INTEGER NOT NULL CHECK (xp_cost > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, protected_date)
);
CREATE INDEX IF NOT EXISTS idx_streak_protections_month ON public.streak_protections(user_id, created_at DESC);
ALTER TABLE public.streak_protections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own streak protections" ON public.streak_protections;
CREATE POLICY "Readers view own streak protections" ON public.streak_protections FOR SELECT USING(auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.reader_xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  transaction_type VARCHAR(40) NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reader_xp_transactions_user ON public.reader_xp_transactions(user_id, created_at DESC);
ALTER TABLE public.reader_xp_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Readers view own XP ledger" ON public.reader_xp_transactions;
CREATE POLICY "Readers view own XP ledger" ON public.reader_xp_transactions FOR SELECT USING(auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.restore_reading_streak(p_user_id UUID, p_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_today DATE := (NOW() AT TIME ZONE 'Asia/Tashkent')::DATE;
  v_month_start DATE := date_trunc('month', v_today)::DATE;
  v_used INTEGER; v_cost INTEGER; v_earned INTEGER; v_spent INTEGER; v_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN RAISE EXCEPTION 'Ruxsat yoq'; END IF;
  IF p_date >= v_today OR p_date < v_month_start THEN RAISE EXCEPTION 'Faqat shu oy ichidagi otkazib yuborilgan kun tiklanadi'; END IF;
  IF EXISTS(SELECT 1 FROM public.reading_daily_activity WHERE user_id=p_user_id AND activity_date=p_date AND (pages_read>0 OR xp>0)) THEN RAISE EXCEPTION 'Bu kunda mutolaa faolligi mavjud'; END IF;
  SELECT COUNT(*) INTO v_used FROM public.streak_protections WHERE user_id=p_user_id AND protected_date>=v_month_start;
  IF v_used >= 3 THEN RAISE EXCEPTION 'Bu oy uchun 3 ta himoya ishlatib bolingan'; END IF;
  v_cost := CASE v_used WHEN 0 THEN 100 WHEN 1 THEN 200 ELSE 350 END;
  SELECT COALESCE(SUM(xp),0) INTO v_earned FROM public.reading_daily_activity WHERE user_id=p_user_id;
  SELECT COALESCE(SUM(amount),0) INTO v_spent FROM public.reader_xp_transactions WHERE user_id=p_user_id;
  IF v_earned + v_spent < v_cost THEN RAISE EXCEPTION 'XP yetarli emas'; END IF;
  INSERT INTO public.streak_protections(user_id,protected_date,xp_cost) VALUES(p_user_id,p_date,v_cost) RETURNING id INTO v_id;
  INSERT INTO public.reader_xp_transactions(user_id,amount,transaction_type,reference_id) VALUES(p_user_id,-v_cost,'streak_protection',v_id);
  RETURN jsonb_build_object('success',true,'protectedDate',p_date,'xpCost',v_cost,'remainingThisMonth',2-v_used,'availableXp',v_earned+v_spent-v_cost);
END; $$;
REVOKE ALL ON FUNCTION public.restore_reading_streak(UUID,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_reading_streak(UUID,DATE) TO service_role;
