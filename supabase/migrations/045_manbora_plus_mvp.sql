-- Manbora Plus: admin-curated catalogue and 30-day, balance-funded subscriptions.
ALTER TABLE public.works ADD COLUMN IF NOT EXISTS is_plus boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_works_plus_public ON public.works(published_at DESC)
  WHERE is_plus = true AND status = 'published' AND is_archived = false;

-- Defence in depth: direct Supabase calls cannot bypass the admin-only rule.
CREATE OR REPLACE FUNCTION public.enforce_work_plus_admin_only() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.is_plus THEN RETURN NEW; END IF;
  ELSIF NEW.is_plus IS NOT DISTINCT FROM OLD.is_plus THEN
    RETURN NEW;
  END IF;
  IF NEW.is_plus IS NOT NULL THEN
    IF auth.role() <> 'service_role' AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true
    ) THEN
      RAISE EXCEPTION 'ADMIN_REQUIRED_FOR_PLUS';
    END IF;
  END IF;
  IF NEW.is_plus AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id=NEW.author_id AND is_admin=true
  ) THEN
    RAISE EXCEPTION 'ONLY_ADMIN_WORKS_CAN_BE_PLUS';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_enforce_work_plus_admin_only ON public.works;
CREATE TRIGGER trg_enforce_work_plus_admin_only
  BEFORE INSERT OR UPDATE OF is_plus ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.enforce_work_plus_admin_only();

INSERT INTO public.platform_settings(key, value)
VALUES ('plus_monthly_price', '30000') ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.plus_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  price_paid bigint NOT NULL CHECK (price_paid > 0),
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_plus_subscription_access
  ON public.plus_subscriptions(user_id, expires_at DESC) WHERE status = 'active';
ALTER TABLE public.plus_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own Plus subscriptions" ON public.plus_subscriptions;
CREATE POLICY "Users view own Plus subscriptions" ON public.plus_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.purchase_manbora_plus(
  p_user_id uuid,
  p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_price bigint;
  v_wallet public.wallet_accounts%ROWTYPE;
  v_platform public.wallet_accounts%ROWTYPE;
  v_existing public.plus_subscriptions%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
  v_id uuid;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Ruxsat berilmagan';
  END IF;
  IF nullif(btrim(p_idempotency_key), '') IS NULL THEN RAISE EXCEPTION 'Xarid kaliti kerak'; END IF;
  SELECT * INTO v_existing FROM public.plus_subscriptions WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Xarid kaliti boshqa foydalanuvchiga tegishli'; END IF;
    RETURN jsonb_build_object('success',true,'idempotent',true,'subscription_id',v_existing.id,'expires_at',v_existing.expires_at);
  END IF;
  SELECT value::bigint INTO v_price FROM public.platform_settings WHERE key='plus_monthly_price';
  IF coalesce(v_price,0) <= 0 THEN RAISE EXCEPTION 'Plus narxi sozlanmagan'; END IF;
  INSERT INTO public.wallet_accounts(user_id,account_type,balance)
    VALUES(p_user_id,'reader_credit',0) ON CONFLICT(user_id,account_type) DO NOTHING;
  SELECT * INTO v_wallet FROM public.wallet_accounts
    WHERE user_id=p_user_id AND account_type='reader_credit' FOR UPDATE;
  IF v_wallet.balance < v_price THEN RAISE EXCEPTION 'Balansda mablag‘ yetarli emas'; END IF;
  SELECT * INTO v_existing FROM public.plus_subscriptions
    WHERE user_id=p_user_id AND status='active' AND expires_at>now()
    ORDER BY expires_at DESC LIMIT 1 FOR UPDATE;
  v_start := CASE WHEN FOUND THEN v_existing.expires_at ELSE now() END;
  v_end := v_start + interval '30 days';
  UPDATE public.wallet_accounts SET balance=balance-v_price,updated_at=now() WHERE id=v_wallet.id;
  INSERT INTO public.wallet_accounts(id,user_id,account_type,balance)
    VALUES('00000000-0000-0000-0000-000000000001',NULL,'platform_revenue',0)
    ON CONFLICT DO NOTHING;
  SELECT * INTO v_platform FROM public.wallet_accounts
    WHERE id='00000000-0000-0000-0000-000000000001' FOR UPDATE;
  UPDATE public.wallet_accounts SET balance=balance+v_price,updated_at=now() WHERE id=v_platform.id;
  INSERT INTO public.plus_subscriptions(user_id,status,starts_at,expires_at,price_paid,idempotency_key)
    VALUES(p_user_id,'active',v_start,v_end,v_price,p_idempotency_key) RETURNING id INTO v_id;
  INSERT INTO public.wallet_transactions(account_id,amount,transaction_type,reference_type,reference_id,idempotency_key,description,actor_id,balance_after)
  VALUES
    (v_wallet.id,-v_price,'purchase_debit','manual',v_id::text,p_idempotency_key||':debit','Manbora Plus — 30 kun',p_user_id,v_wallet.balance-v_price),
    (v_platform.id,v_price,'platform_fee_credit','manual',v_id::text,p_idempotency_key||':credit','Manbora Plus daromadi',p_user_id,v_platform.balance+v_price);
  RETURN jsonb_build_object('success',true,'subscription_id',v_id,'price_paid',v_price,'balance_after',v_wallet.balance-v_price,'expires_at',v_end);
END; $$;
REVOKE ALL ON FUNCTION public.purchase_manbora_plus(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_manbora_plus(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.expire_manbora_plus() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.plus_subscriptions SET status='expired',updated_at=now()
    WHERE status='active' AND expires_at<=now();
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.expire_manbora_plus() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_manbora_plus() TO service_role;

CREATE OR REPLACE FUNCTION public.get_admin_plus_stats(p_admin_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin_id AND is_admin=true) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;
  SELECT jsonb_build_object(
    'totalRevenue', coalesce((SELECT sum(price_paid) FROM public.plus_subscriptions),0),
    'activeCount', coalesce((SELECT count(DISTINCT user_id) FROM public.plus_subscriptions
      WHERE status='active' AND starts_at<=now() AND expires_at>now()),0),
    'monthly', coalesce((
      SELECT jsonb_agg(jsonb_build_object('month',m.month,'revenue',m.revenue) ORDER BY m.month)
      FROM (
        SELECT to_char(date_trunc('month',created_at),'YYYY-MM') AS month, sum(price_paid) AS revenue
        FROM public.plus_subscriptions GROUP BY date_trunc('month',created_at)
      ) m
    ),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_plus_stats(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_plus_stats(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_work_plus(p_work_id uuid,p_admin_id uuid,p_is_plus boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_admin_id AND is_admin=true) THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.works w JOIN public.profiles p ON p.id=w.author_id WHERE w.id=p_work_id AND p.is_admin=true) THEN
    RAISE EXCEPTION 'ONLY_ADMIN_WORKS_CAN_BE_PLUS';
  END IF;
  UPDATE public.works SET is_plus=p_is_plus,updated_at=now() WHERE id=p_work_id;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.set_work_plus(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_work_plus(uuid,uuid,boolean) TO service_role;

-- Direct Supabase reads follow the same canonical Plus access rules as the server.
DROP POLICY IF EXISTS "Read chapter content if free, purchased, author, or admin" ON public.chapter_contents;
CREATE POLICY "Read chapter content if free, purchased, author, or admin"
  ON public.chapter_contents FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      WHERE c.id=chapter_contents.chapter_id AND c.status='published' AND w.status='published'
        AND (c.is_free=true OR c.is_preview_free=true OR (w.is_plus=true AND c.chapter_number=1))
    )
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      JOIN public.plus_subscriptions ps ON ps.user_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND w.is_plus=true
        AND c.status='published' AND w.status='published'
        AND ps.status='active' AND ps.starts_at<=now() AND ps.expires_at>now()
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.entitlements e ON e.user_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND (
        (e.entitlement_type='full_work' AND e.work_id=c.work_id) OR
        (e.entitlement_type='chapter' AND e.chapter_id=c.id)
      )
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.purchases p ON p.buyer_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND p.status IN ('active','completed','paid') AND (
        (p.purchase_type='full_work' AND p.work_id=c.work_id) OR
        (p.purchase_type='chapter' AND p.chapter_id=c.id)
      )
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      WHERE c.id=chapter_contents.chapter_id AND w.author_id=auth.uid()
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true
    ))
  );
