-- ============================================================================
-- MANBORA PLATFORM MIGRATION 013
-- Manual Balance Top-up Journey, Public Human-Readable Manbora ID Sequence,
-- Admin Atomic Wallet Balance Adjustment RPC, and Safe Deprecation of topup_requests
-- ============================================================================

-- 1. PUBLIC HUMAN-READABLE MANBORA USER ID SEQUENCE
-- Format: MB-00001001, MB-00001002, etc. (Unique, Sequential, Never Reused, Immutable)
CREATE SEQUENCE IF NOT EXISTS public.manbora_user_seq START WITH 1001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_manbora_id()
RETURNS TEXT AS $$
BEGIN
  RETURN 'MB-' || LPAD(nextval('public.manbora_user_seq')::text, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- Add email column to profiles for indexed administrative search if not already present
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (LOWER(email));

-- Backfill profile email from auth.users where possible
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Update handle_new_user() trigger to use sequential human-readable public_id and store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
  v_public_id TEXT;
BEGIN
  -- Generate unique sequential public ID e.g. MB-00001001
  v_public_id := public.generate_manbora_id();
  
  -- Username fallback from metadata or email prefix
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 4)
  );
  
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id, public_id, display_name, username, avatar_url, bio, telegram_username, email, is_admin
  )
  VALUES (
    NEW.id,
    v_public_id,
    v_display_name,
    v_username,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'telegram_username',
    NEW.email,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    updated_at = now();

  -- Create primary reader wallet account
  INSERT INTO public.wallet_accounts (user_id, account_type, balance)
  VALUES (NEW.id, 'reader_credit', 0)
  ON CONFLICT (user_id, account_type) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Standardize existing profiles public_id format if needed (preserves valid MB- identifiers)
UPDATE public.profiles
SET public_id = public.generate_manbora_id()
WHERE public_id IS NULL OR public_id NOT LIKE 'MB-%';

-- ============================================================================
-- 2. ADMIN WALLET BALANCE ADJUSTMENT RPC (ATOMIC CREDIT & DEBIT)
-- Protected by server-side admin check, row locking, immutable ledger, and audit log.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet_balance(
  p_target_user_id UUID,
  p_action TEXT,              -- 'credit' (pul qo'shish) or 'debit' (pul ayrish)
  p_amount BIGINT,            -- Positive integer in UZS
  p_reason TEXT,              -- Mandatory reason
  p_note TEXT DEFAULT NULL,   -- Optional admin note
  p_idempotency_key TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_is_admin BOOLEAN;
  v_account_id UUID;
  v_current_bal BIGINT;
  v_new_bal BIGINT;
  v_idempotency_key TEXT;
  v_existing_tx RECORD;
  v_tx_id UUID;
  v_log_id UUID;
BEGIN
  -- 1. Identify caller and verify administrative permissions
  IF auth.role() = 'service_role' THEN
    v_actor_id := COALESCE(p_admin_id, auth.uid());
  ELSE
    v_actor_id := auth.uid();
  END IF;

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Autentifikatsiya talab etiladi';
  END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_actor_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Faqat tasdiqlangan administratorlar balansni o‘zgartirishi mumkin';
  END IF;

  -- 2. Validate input parameters
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Foydalanuvchi identifikatori ko‘rsatilmadi';
  END IF;

  IF p_action NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'Noto‘g‘ri amal turi: faqat "credit" yoki "debit" bo‘lishi shart';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Summa musbat butun son bo‘lishi shart (UZS)';
  END IF;

  IF p_amount > 100000000 THEN
    RAISE EXCEPTION 'Bir martalik maksimal o‘zgartirish summasi 100 000 000 so‘mdan oshmasligi lozim';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Balansni o‘zgartirish sababi majburiy ko‘rsatilishi shart';
  END IF;

  -- 3. Check idempotency to prevent double-crediting
  v_idempotency_key := NULLIF(TRIM(p_idempotency_key), '');
  IF v_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing_tx
    FROM public.wallet_transactions
    WHERE idempotency_key = v_idempotency_key;

    IF FOUND THEN
      -- Already executed with this idempotency key: return existing receipt safely
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'transaction_id', v_existing_tx.id,
        'action', p_action,
        'amount', ABS(v_existing_tx.amount),
        'balance_after', v_existing_tx.balance_after,
        'message', 'Ushbu operatsiya allaqachon bajarilgan (takrorlanishdan himoyalangan)'
      );
    END IF;
  ELSE
    v_idempotency_key := 'admin_adj_' || gen_random_uuid()::text;
  END IF;

  -- 4. Lock target reader wallet account row for update
  SELECT id, balance INTO v_account_id, v_current_bal
  FROM public.wallet_accounts
  WHERE user_id = p_target_user_id AND account_type = 'reader_credit'
  FOR UPDATE;

  IF NOT FOUND THEN
    IF p_action = 'debit' THEN
      RAISE EXCEPTION 'Foydalanuvchi hamyoni topilmadi va debit amalini bajarib bo‘lmaydi';
    END IF;

    -- Create wallet if first-time credit
    INSERT INTO public.wallet_accounts (user_id, account_type, balance)
    VALUES (p_target_user_id, 'reader_credit', 0)
    RETURNING id, balance INTO v_account_id, v_current_bal;
  END IF;

  -- 5. Calculate new balance and verify overdraft protection
  IF p_action = 'debit' THEN
    IF v_current_bal < p_amount THEN
      RAISE EXCEPTION 'Foydalanuvchi balansida yetarli mablag‘ mavjud emas. Joriy balans: % so‘m, so‘ralgan debit: % so‘m',
        v_current_bal, p_amount;
    END IF;
    v_new_bal := v_current_bal - p_amount;
  ELSE
    v_new_bal := v_current_bal + p_amount;
  END IF;

  -- 6. Atomically update wallet balance
  UPDATE public.wallet_accounts
  SET balance = v_new_bal, updated_at = now()
  WHERE id = v_account_id;

  -- 7. Insert immutable ledger entry
  INSERT INTO public.wallet_transactions (
    account_id,
    amount,
    transaction_type,
    reference_type,
    reference_id,
    idempotency_key,
    description,
    actor_id,
    balance_after
  ) VALUES (
    v_account_id,
    CASE WHEN p_action = 'credit' THEN p_amount ELSE -p_amount END,
    CASE WHEN p_reason ILIKE '%telegram%' THEN 'topup' ELSE 'adjustment' END,
    'manual',
    v_idempotency_key,
    v_idempotency_key,
    TRIM(p_reason) || CASE WHEN p_note IS NOT NULL AND TRIM(p_note) <> '' THEN ' (' || TRIM(p_note) || ')' ELSE '' END,
    v_actor_id,
    v_new_bal
  ) RETURNING id INTO v_tx_id;

  -- 8. Record in admin audit log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, metadata
  ) VALUES (
    v_actor_id,
    'wallet_adjustment_' || p_action,
    'wallet_accounts',
    v_account_id::text,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'action', p_action,
      'amount', p_amount,
      'reason', p_reason,
      'admin_note', p_note,
      'balance_before', v_current_bal,
      'balance_after', v_new_bal,
      'idempotency_key', v_idempotency_key,
      'transaction_id', v_tx_id
    )
  ) RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'audit_log_id', v_log_id,
    'target_user_id', p_target_user_id,
    'action', p_action,
    'amount', p_amount,
    'balance_before', v_current_bal,
    'balance_after', v_new_bal,
    'idempotency_key', v_idempotency_key,
    'created_at', now()
  );
END;
$$;

-- Revoke public permissions, grant strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet_balance(UUID, TEXT, BIGINT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet_balance(UUID, TEXT, BIGINT, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- ============================================================================
-- 3. SAFE DEPRECATION OF topup_requests
-- Preserves existing audit history while stopping on-site web submissions
-- ============================================================================
COMMENT ON TABLE public.topup_requests IS 'DEPRECATED: Manual top-up workflow transitioned to Telegram coordination. Historical rows preserved for audit.';

-- Restrict new direct web inserts by regular users (only admins/service role can modify)
DROP POLICY IF EXISTS "Readers can create pending topup requests" ON public.topup_requests;
CREATE POLICY "Readers cannot create new topup requests"
  ON public.topup_requests FOR INSERT
  WITH CHECK (false);

-- End of Migration 013
