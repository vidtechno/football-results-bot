-- ============================================================================
-- Migration 031: Fix purchase_content Platform Revenue Account
-- ============================================================================
-- Description:
-- Fix critical bug in purchase_content RPC where platform fee was querying/inserting
-- account_type = 'platform_commission', violating wallet_accounts_account_type_check.
-- The valid account_type is 'platform_revenue' and target ID is '00000000-0000-0000-0000-000000000001'.
--
-- Safety:
-- Forward-only, atomic, non-destructive.
-- Preserves financial semantics:
-- - Exact 1-time reader debit
-- - Author 80% revenue credit
-- - Platform 20% commission credit into platform_revenue account
-- - Immutable double-entry transaction ledger
-- - Idempotency guards against duplicate charges
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_content(
  p_work_id UUID,
  p_chapter_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_work RECORD;
  v_chapter RECORD;
  v_author_id UUID;
  v_price BIGINT;
  v_purchase_type TEXT;
  v_existing_purchase RECORD;
  v_commission_pct INT := 20;
  v_commission_val BIGINT;
  v_author_net BIGINT;
  v_reader_acc RECORD;
  v_author_acc_id UUID;
  v_author_current_bal BIGINT;
  v_platform_acc_id UUID;
  v_platform_current_bal BIGINT;
  v_new_reader_bal BIGINT;
  v_purchase_id UUID;
BEGIN
  -- Authenticate buyer
  IF auth.role() = 'service_role' THEN
    v_buyer_id := COALESCE(p_user_id, auth.uid());
  ELSE
    v_buyer_id := auth.uid();
  END IF;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Xarid qilish uchun tizimga kirishingiz lozim';
  END IF;

  -- Verify idempotency
  SELECT * INTO v_existing_purchase
  FROM public.purchases
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'purchase_id', v_existing_purchase.id,
      'message', 'Bu xarid allaqachon amalga oshirilgan'
    );
  END IF;

  -- Verify published work
  SELECT * INTO v_work FROM public.works WHERE id = p_work_id;
  IF NOT FOUND OR v_work.status != 'published' THEN
    RAISE EXCEPTION 'Asar topilmadi yoki hali e''lon qilinmagan';
  END IF;

  v_author_id := v_work.author_id;

  -- Author cannot purchase their own work
  IF v_buyer_id = v_author_id THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_owned', true,
      'message', 'Siz ushbu asarning muallifisiz'
    );
  END IF;

  -- CANONICAL RULE: Fully free work cannot be purchased at all
  IF v_work.access_type = 'free' THEN
    RAISE EXCEPTION 'Ushbu asar to‘liq bepul, xarid qilish talab etilmaydi';
  END IF;

  -- Determine purchase type and price
  IF p_chapter_id IS NOT NULL THEN
    -- Under whole-work access model, chapter-level purchases are strictly disallowed
    IF v_work.access_type IN ('paid_full_work', 'paid_book') THEN
      RAISE EXCEPTION 'Ushbu asar faqat to‘liq sotiladi, alohida bob xarid qilinmaydi';
    END IF;

    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND work_id = p_work_id;
    IF NOT FOUND OR v_chapter.status != 'published' THEN
      RAISE EXCEPTION 'Bob topilmadi yoki e''lon qilinmagan';
    END IF;

    IF v_chapter.is_free THEN
      RAISE EXCEPTION 'Ushbu bob bepul, xarid qilish talab etilmaydi';
    END IF;

    -- Check if reader already bought full work or this chapter
    SELECT * INTO v_existing_purchase
    FROM public.purchases
    WHERE buyer_id = v_buyer_id
      AND work_id = p_work_id
      AND (purchase_type = 'full_work' OR chapter_id = p_chapter_id)
      AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_owned', true,
        'message', 'Sizda ushbu bobga allaqachon ruxsat mavjud'
      );
    END IF;

    v_price := v_chapter.price;
    v_purchase_type := 'chapter';
  ELSE
    -- Purchasing full work
    IF v_work.access_type = 'paid_by_chapter' THEN
      RAISE EXCEPTION 'Ushbu asar bobma-bob sotiladi, alohida bobni tanlang';
    END IF;

    SELECT * INTO v_existing_purchase
    FROM public.purchases
    WHERE buyer_id = v_buyer_id
      AND work_id = p_work_id
      AND purchase_type = 'full_work'
      AND status = 'active'
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_owned', true,
        'message', 'Siz ushbu asarni allaqachon to‘liq xarid qilgansiz'
      );
    END IF;

    v_price := v_work.full_work_price;
    v_purchase_type := 'full_work';
  END IF;

  IF v_price <= 0 THEN
    RAISE EXCEPTION 'Xarid narxi noto‘g‘ri ko‘rsatilgan';
  END IF;

  -- Read platform commission percentage
  SELECT (value)::int INTO v_commission_pct
  FROM public.platform_settings
  WHERE key = 'commission_percentage';
  v_commission_pct := COALESCE(v_commission_pct, 20);

  v_commission_val := FLOOR(v_price * v_commission_pct / 100);
  v_author_net := v_price - v_commission_val;

  -- Lock and verify reader balance
  SELECT id, balance INTO v_reader_acc
  FROM public.wallet_accounts
  WHERE user_id = v_buyer_id AND account_type = 'reader_credit'
  FOR UPDATE;

  IF NOT FOUND OR v_reader_acc.balance < v_price THEN
    RAISE EXCEPTION 'Hisobingizda mablag‘ yetarli emas. Balansingiz: % so‘m, Talab qilinadi: % so‘m',
      COALESCE(v_reader_acc.balance, 0), v_price;
  END IF;

  -- Find or initialize author available earnings account
  SELECT id, balance INTO v_author_acc_id, v_author_current_bal
  FROM public.wallet_accounts
  WHERE user_id = v_author_id AND account_type = 'author_earnings_available'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts (user_id, account_type, balance)
    VALUES (v_author_id, 'author_earnings_available', 0)
    RETURNING id, balance INTO v_author_acc_id, v_author_current_bal;
  END IF;

  -- Find or initialize platform fee account (using platform_revenue)
  SELECT id, balance INTO v_platform_acc_id, v_platform_current_bal
  FROM public.wallet_accounts
  WHERE id = '00000000-0000-0000-0000-000000000001' OR (user_id IS NULL AND account_type = 'platform_revenue')
  FOR UPDATE
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts (id, user_id, account_type, balance)
    VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'platform_revenue', 0)
    RETURNING id, balance INTO v_platform_acc_id, v_platform_current_bal;
  END IF;

  -- 1. Create purchase record
  INSERT INTO public.purchases (
    buyer_id,
    author_id,
    work_id,
    chapter_id,
    purchase_type,
    gross_amount,
    commission_amount,
    author_net_amount,
    idempotency_key,
    status
  )
  VALUES (
    v_buyer_id,
    v_author_id,
    p_work_id,
    p_chapter_id,
    v_purchase_type,
    v_price,
    v_commission_val,
    v_author_net,
    p_idempotency_key,
    'active'
  )
  RETURNING id INTO v_purchase_id;

  -- 2. Debit reader wallet
  v_new_reader_bal := v_reader_acc.balance - v_price;
  UPDATE public.wallet_accounts
  SET balance = v_new_reader_bal, updated_at = now()
  WHERE id = v_reader_acc.id;

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
  )
  VALUES (
    v_reader_acc.id,
    -v_price,
    'purchase_debit',
    'purchase',
    v_purchase_id,
    p_idempotency_key || '_reader_debit',
    'Asar xaridi: ' || v_work.title,
    v_buyer_id,
    v_new_reader_bal
  );

  -- 3. Credit author earnings
  UPDATE public.wallet_accounts
  SET balance = v_author_current_bal + v_author_net, updated_at = now()
  WHERE id = v_author_acc_id;

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
  )
  VALUES (
    v_author_acc_id,
    v_author_net,
    'author_sale_credit',
    'purchase',
    v_purchase_id,
    p_idempotency_key || '_author_credit',
    'Asar sotuvidan daromad: ' || v_work.title,
    v_buyer_id,
    v_author_current_bal + v_author_net
  );

  -- 4. Credit platform commission account
  UPDATE public.wallet_accounts
  SET balance = v_platform_current_bal + v_commission_val, updated_at = now()
  WHERE id = v_platform_acc_id;

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
  )
  VALUES (
    v_platform_acc_id,
    v_commission_val,
    'platform_fee_credit',
    'purchase',
    v_purchase_id,
    p_idempotency_key || '_platform_fee',
    'Platforma komissiyasi (' || v_commission_pct || '%): ' || v_work.title,
    v_buyer_id,
    v_platform_current_bal + v_commission_val
  );

  -- 5. Record Entitlement record
  INSERT INTO public.entitlements (
    user_id,
    work_id,
    chapter_id,
    entitlement_type,
    source_purchase_id
  )
  VALUES (
    v_buyer_id,
    p_work_id,
    p_chapter_id,
    v_purchase_type,
    v_purchase_id
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'gross_amount', v_price,
    'balance_after', v_new_reader_bal
  );
END;
$$;
