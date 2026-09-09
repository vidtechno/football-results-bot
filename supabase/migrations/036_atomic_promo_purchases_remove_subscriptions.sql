-- Remove the currently unused author-subscription product without deleting history.
UPDATE public.author_subscription_plans SET is_active = FALSE WHERE is_active = TRUE;
DROP FUNCTION IF EXISTS public.purchase_author_subscription(UUID, UUID, TEXT);

-- A purchase with an optional promo code. All balance, ledger, redemption and
-- entitlement writes happen in this single PostgreSQL transaction.
CREATE OR REPLACE FUNCTION public.purchase_content_with_promo(
  p_work_id UUID,
  p_chapter_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id UUID;
  v_work RECORD;
  v_existing_purchase RECORD;
  v_promo RECORD;
  v_promo_id UUID := NULL;
  v_applied_promo_code TEXT := NULL;
  v_original_price BIGINT;
  v_discount BIGINT := 0;
  v_price BIGINT;
  v_commission_pct INT := 20;
  v_commission BIGINT;
  v_author_net BIGINT;
  v_reader RECORD;
  v_author RECORD;
  v_platform RECORD;
  v_purchase_id UUID;
BEGIN
  IF auth.role() = 'service_role' THEN
    v_buyer_id := COALESCE(p_user_id, auth.uid());
  ELSE
    v_buyer_id := auth.uid();
  END IF;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Xarid qilish uchun tizimga kirishingiz lozim';
  END IF;
  IF NULLIF(TRIM(p_idempotency_key), '') IS NULL THEN
    RAISE EXCEPTION 'Xarid kaliti ko‘rsatilmagan';
  END IF;
  IF p_chapter_id IS NOT NULL THEN
    RAISE EXCEPTION 'Asar faqat to‘liq sotiladi, alohida bob xarid qilinmaydi';
  END IF;

  SELECT * INTO v_existing_purchase
  FROM public.purchases
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'idempotent', TRUE,
      'purchase_id', v_existing_purchase.id,
      'gross_amount', v_existing_purchase.gross_amount,
      'message', 'Bu xarid allaqachon amalga oshirilgan'
    );
  END IF;

  SELECT * INTO v_work
  FROM public.works
  WHERE id = p_work_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asar topilmadi yoki hali e’lon qilinmagan';
  END IF;
  IF v_work.author_id = v_buyer_id THEN
    RETURN jsonb_build_object('success', TRUE, 'already_owned', TRUE, 'message', 'Siz ushbu asarning muallifisiz');
  END IF;
  IF v_work.access_type = 'free' THEN
    RETURN jsonb_build_object('success', TRUE, 'already_owned', TRUE, 'message', 'Ushbu asar bepul');
  END IF;
  IF v_work.access_type NOT IN ('paid_full_work', 'paid_book') THEN
    RAISE EXCEPTION 'Asarning sotuv turi qo‘llab-quvvatlanmaydi';
  END IF;

  SELECT * INTO v_existing_purchase
  FROM public.purchases
  WHERE buyer_id = v_buyer_id AND work_id = p_work_id
    AND purchase_type = 'full_work' AND status = 'active'
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', TRUE, 'already_owned', TRUE, 'message', 'Siz ushbu asarni allaqachon xarid qilgansiz');
  END IF;

  v_original_price := v_work.full_work_price;
  IF v_original_price IS NULL OR v_original_price <= 0 THEN
    RAISE EXCEPTION 'Asar narxi noto‘g‘ri ko‘rsatilgan';
  END IF;

  IF NULLIF(TRIM(p_promo_code), '') IS NOT NULL THEN
    SELECT * INTO v_promo
    FROM public.promo_codes
    WHERE code = UPPER(TRIM(p_promo_code))
    FOR UPDATE;

    IF NOT FOUND OR NOT v_promo.is_active THEN
      RAISE EXCEPTION 'Promo-kod mavjud emas yoki faol emas';
    END IF;
    IF v_promo.author_id IS DISTINCT FROM v_work.author_id THEN
      RAISE EXCEPTION 'Promo-kod ushbu muallifga tegishli emas';
    END IF;
    IF v_promo.work_id IS NOT NULL AND v_promo.work_id <> p_work_id THEN
      RAISE EXCEPTION 'Promo-kod ushbu asarga tegishli emas';
    END IF;
    IF v_promo.starts_at > NOW() OR (v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= NOW()) THEN
      RAISE EXCEPTION 'Promo-kodning amal qilish muddati tugagan';
    END IF;
    IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN
      RAISE EXCEPTION 'Promo-koddan foydalanish limiti tugagan';
    END IF;

    IF v_promo.discount_type = 'percent' THEN
      v_discount := FLOOR(v_original_price * LEAST(v_promo.discount_value, 90) / 100.0);
    ELSE
      v_discount := LEAST(v_original_price, v_promo.discount_value);
    END IF;
    v_promo_id := v_promo.id;
    v_applied_promo_code := v_promo.code;
  END IF;

  v_price := GREATEST(0, v_original_price - v_discount);
  SELECT COALESCE((value)::INT, 20) INTO v_commission_pct
  FROM public.platform_settings WHERE key = 'commission_percentage';
  v_commission_pct := LEAST(100, GREATEST(0, COALESCE(v_commission_pct, 20)));
  v_commission := FLOOR(v_price * v_commission_pct / 100.0);
  v_author_net := v_price - v_commission;

  SELECT id, balance INTO v_reader
  FROM public.wallet_accounts
  WHERE user_id = v_buyer_id AND account_type = 'reader_credit'
  FOR UPDATE;
  IF NOT FOUND OR v_reader.balance < v_price THEN
    RAISE EXCEPTION 'Hisobingizda mablag‘ yetarli emas. Balans: %, kerak: %', COALESCE(v_reader.balance, 0), v_price;
  END IF;

  INSERT INTO public.wallet_accounts(user_id, account_type, balance)
  VALUES(v_work.author_id, 'author_earnings_available', 0)
  ON CONFLICT(user_id, account_type) DO NOTHING;
  SELECT id, balance INTO v_author
  FROM public.wallet_accounts
  WHERE user_id = v_work.author_id AND account_type = 'author_earnings_available'
  FOR UPDATE;

  SELECT id, balance INTO v_platform
  FROM public.wallet_accounts
  WHERE id = '00000000-0000-0000-0000-000000000001'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Platforma moliyaviy hisobi topilmadi';
  END IF;

  INSERT INTO public.purchases(
    buyer_id, author_id, work_id, chapter_id, purchase_type,
    gross_amount, commission_amount, author_net_amount, idempotency_key, status
  ) VALUES (
    v_buyer_id, v_work.author_id, p_work_id, NULL, 'full_work',
    v_price, v_commission, v_author_net, p_idempotency_key, 'active'
  ) RETURNING id INTO v_purchase_id;

  UPDATE public.wallet_accounts SET balance = balance - v_price, updated_at = NOW() WHERE id = v_reader.id;
  UPDATE public.wallet_accounts SET balance = balance + v_author_net, updated_at = NOW() WHERE id = v_author.id;
  UPDATE public.wallet_accounts SET balance = balance + v_commission, updated_at = NOW() WHERE id = v_platform.id;

  INSERT INTO public.wallet_transactions(
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES
    (v_reader.id, -v_price, 'purchase_debit', 'purchase', v_purchase_id::TEXT,
      p_idempotency_key || '_reader', 'Asar xaridi: ' || v_work.title, v_buyer_id, v_reader.balance - v_price),
    (v_author.id, v_author_net, 'author_sale_credit', 'purchase', v_purchase_id::TEXT,
      p_idempotency_key || '_author', 'Asar sotuvidan daromad: ' || v_work.title, v_buyer_id, v_author.balance + v_author_net),
    (v_platform.id, v_commission, 'platform_fee_credit', 'purchase', v_purchase_id::TEXT,
      p_idempotency_key || '_platform', 'Platforma komissiyasi: ' || v_work.title, v_buyer_id, v_platform.balance + v_commission);

  INSERT INTO public.entitlements(user_id, work_id, chapter_id, entitlement_type, source_purchase_id)
  VALUES(v_buyer_id, p_work_id, NULL, 'full_work', v_purchase_id)
  ON CONFLICT DO NOTHING;

  IF v_promo_id IS NOT NULL THEN
    UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = v_promo_id;
    INSERT INTO public.promo_redemptions(promo_id, user_id, purchase_id, discount_amount)
    VALUES(v_promo_id, v_buyer_id, v_purchase_id, v_discount);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'purchase_id', v_purchase_id,
    'original_price', v_original_price,
    'discount_amount', v_discount,
    'gross_amount', v_price,
    'balance_after', v_reader.balance - v_price,
    'promo_code', v_applied_promo_code
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_content_with_promo(UUID, UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_content_with_promo(UUID, UUID, TEXT, UUID, TEXT) TO service_role;
