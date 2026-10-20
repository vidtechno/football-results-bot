-- 053: Admin uchun foydalanuvchi holati (oxirgi kirish, bloklash) va serverda filtrlanadigan ro'yxat.
-- Jadval ommaga yopiq: faqat server (service_role) o'qiydi va yozadi.

CREATE TABLE IF NOT EXISTS public.user_admin_state (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen_at timestamptz,
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_at timestamptz,
  blocked_reason text,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_admin_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_admin_state FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_user_admin_state_seen ON public.user_admin_state(last_seen_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_user_admin_state_blocked ON public.user_admin_state(user_id) WHERE is_blocked;

-- Mavjud foydalanuvchilar uchun oxirgi faollikni tarixdan to'ldirish
INSERT INTO public.user_admin_state (user_id, last_seen_at)
SELECT p.id, GREATEST(u.last_sign_in_at, ev.last_event)
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN (
  SELECT user_id, max(created_at) AS last_event
  FROM public.analytics_events WHERE user_id IS NOT NULL GROUP BY user_id
) ev ON ev.user_id = p.id
ON CONFLICT (user_id) DO NOTHING;

-- Faollikni belgilash: 3 daqiqada bir martadan ko'p yozilmaydi (bazani yuklamaslik uchun)
CREATE OR REPLACE FUNCTION public.touch_user_seen(p_user_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.user_admin_state (user_id, last_seen_at)
  SELECT id, now() FROM public.profiles WHERE id = p_user_id
  ON CONFLICT (user_id) DO UPDATE SET last_seen_at = now(), updated_at = now()
  WHERE public.user_admin_state.last_seen_at IS NULL
     OR public.user_admin_state.last_seen_at < now() - interval '3 minutes';
$$;
REVOKE ALL ON FUNCTION public.touch_user_seen(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_user_seen(uuid) TO service_role;

-- Admin foydalanuvchilar ro'yxati: qidiruv, filtr, saralash va sahifalash serverda bajariladi
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_q text DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_sort text DEFAULT 'created_desc',
  p_limit int DEFAULT 15,
  p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_q text := nullif(btrim(coalesce(p_q, '')), '');
  v_pat text;
  v_limit int := least(greatest(coalesce(p_limit, 15), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_result jsonb;
BEGIN
  IF v_q IS NOT NULL THEN
    v_pat := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  WITH base AS (
    SELECT p.id, p.public_id, p.display_name, p.username, p.avatar_url, p.email, p.is_admin, p.created_at,
           ap.status AS author_status, ap.pen_name,
           coalesce(w.balance, 0) AS balance,
           s.last_seen_at,
           coalesce(s.is_blocked, false) AS is_blocked,
           s.blocked_reason,
           EXISTS (
             SELECT 1 FROM public.plus_subscriptions ps
             WHERE ps.user_id = p.id AND ps.status = 'active'
               AND ps.starts_at <= now() AND ps.expires_at > now()
           ) AS has_plus
    FROM public.profiles p
    LEFT JOIN public.author_profiles ap ON ap.user_id = p.id
    LEFT JOIN public.wallet_accounts w ON w.user_id = p.id AND w.account_type = 'reader_credit'
    LEFT JOIN public.user_admin_state s ON s.user_id = p.id
    WHERE v_q IS NULL
       OR p.id::text = v_q
       OR p.display_name ILIKE v_pat ESCAPE '\'
       OR p.username ILIKE v_pat ESCAPE '\'
       OR p.public_id ILIKE v_pat ESCAPE '\'
       OR p.email ILIKE v_pat ESCAPE '\'
  ), filtered AS (
    SELECT * FROM base
    WHERE CASE coalesce(p_filter, 'all')
      WHEN 'admins' THEN is_admin
      WHEN 'authors' THEN author_status IS NOT NULL
      WHEN 'pending_authors' THEN author_status = 'pending'
      WHEN 'readers' THEN NOT is_admin AND author_status IS NULL
      WHEN 'plus' THEN has_plus
      WHEN 'blocked' THEN is_blocked
      WHEN 'positive_balance' THEN balance > 0
      WHEN 'restricted' THEN author_status IN ('suspended', 'rejected')
      WHEN 'online' THEN last_seen_at > now() - interval '5 minutes'
      WHEN 'inactive_30d' THEN last_seen_at IS NULL OR last_seen_at < now() - interval '30 days'
      ELSE true
    END
  ), paged AS (
    SELECT f.*, row_number() OVER (
      ORDER BY
      CASE WHEN p_sort = 'seen_desc' THEN f.last_seen_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'balance_desc' THEN f.balance END DESC,
      CASE WHEN p_sort = 'name_asc' THEN lower(f.display_name) END ASC,
      f.created_at DESC
    ) AS rn
    FROM filtered f
    ORDER BY
      CASE WHEN p_sort = 'seen_desc' THEN f.last_seen_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'balance_desc' THEN f.balance END DESC,
      CASE WHEN p_sort = 'name_asc' THEN lower(f.display_name) END ASC,
      f.created_at DESC
    LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'rows', coalesce((SELECT jsonb_agg(to_jsonb(paged) - 'rn' ORDER BY rn) FROM paged), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_list_users(text, text, text, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, text, text, int, int) TO service_role;

-- Admin tomonidan sovg'a qilingan Plus (narxi 0) ruxsat etiladi
ALTER TABLE public.plus_subscriptions DROP CONSTRAINT IF EXISTS plus_subscriptions_price_paid_check;
ALTER TABLE public.plus_subscriptions ADD CONSTRAINT plus_subscriptions_price_paid_check CHECK (price_paid >= 0);
