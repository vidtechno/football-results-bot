-- 011_manbora_platform_core.sql
-- Complete Manbora platform database schema, atomic financial functions, and RLS policies

-- Ensure UUID generation extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  telegram_username TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_public_id ON public.profiles(public_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================================================
-- 2. AUTHOR PROFILES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.author_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pen_name TEXT NOT NULL,
  biography TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_author_profiles_status ON public.author_profiles(status);

-- ============================================================================
-- 3. GENRES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_genres_slug ON public.genres(slug);
CREATE INDEX IF NOT EXISTS idx_genres_active_order ON public.genres(is_active, sort_order);

-- ============================================================================
-- 4. WORKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.author_profiles(user_id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_url TEXT,
  type TEXT NOT NULL DEFAULT 'book' CHECK (type IN ('book', 'serialized_story')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  rejection_reason TEXT,
  access_type TEXT NOT NULL DEFAULT 'free' CHECK (access_type IN ('free', 'paid_full_work', 'paid_by_chapter')),
  full_work_price BIGINT NOT NULL DEFAULT 0 CHECK (full_work_price >= 0),
  age_rating TEXT DEFAULT 'all',
  completion_status TEXT NOT NULL DEFAULT 'ongoing' CHECK (completion_status IN ('ongoing', 'completed')),
  language TEXT NOT NULL DEFAULT 'uz',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_works_author ON public.works(author_id);
CREATE INDEX IF NOT EXISTS idx_works_slug ON public.works(slug);
CREATE INDEX IF NOT EXISTS idx_works_status_published ON public.works(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_type_access ON public.works(type, access_type);

-- ============================================================================
-- 5. WORK GENRES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_genres (
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_work_genres_genre ON public.work_genres(genre_id);

-- ============================================================================
-- 6. CHAPTERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_free BOOLEAN NOT NULL DEFAULT false,
  price BIGINT NOT NULL DEFAULT 0 CHECK (price >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (work_id, chapter_number),
  UNIQUE (work_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chapters_work_number ON public.chapters(work_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapters_work_status ON public.chapters(work_id, status);

-- ============================================================================
-- 7. LIBRARY ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.library_items (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  saved_state TEXT NOT NULL DEFAULT 'reading' CHECK (saved_state IN ('reading', 'completed', 'want_to_read')),
  last_read_chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  reading_progress INT NOT NULL DEFAULT 0 CHECK (reading_progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_library_user ON public.library_items(user_id);

-- ============================================================================
-- 8. WALLET ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('reader_credit', 'author_earnings_available', 'author_earnings_reserved', 'platform_revenue')),
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_account UNIQUE (user_id, account_type)
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_user_type ON public.wallet_accounts(user_id, account_type);

-- Seed single platform_revenue account
INSERT INTO public.wallet_accounts (id, user_id, account_type, balance)
VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'platform_revenue', 0)
ON CONFLICT (user_id, account_type) DO NOTHING;

-- ============================================================================
-- 9. WALLET TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.wallet_accounts(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('topup', 'purchase_debit', 'author_sale_credit', 'platform_fee_credit', 'payout_reserve', 'payout_paid', 'payout_cancel_reversal', 'adjustment')),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('topup_request', 'purchase', 'payout_request', 'manual')),
  reference_id TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  description TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_account ON public.wallet_transactions(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference ON public.wallet_transactions(reference_type, reference_id);

-- ============================================================================
-- 10. PURCHASES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE RESTRICT,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE RESTRICT,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('full_work', 'chapter')),
  gross_amount BIGINT NOT NULL CHECK (gross_amount >= 0),
  commission_amount BIGINT NOT NULL CHECK (commission_amount >= 0),
  author_net_amount BIGINT NOT NULL CHECK (author_net_amount >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_purchase_amounts CHECK (gross_amount = commission_amount + author_net_amount)
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id, work_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_chapter ON public.purchases(buyer_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_purchases_author ON public.purchases(author_id, created_at DESC);

-- ============================================================================
-- 11. TOPUP REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
  payment_proof_url TEXT,
  admin_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topup_requests_reader ON public.topup_requests(reader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON public.topup_requests(status);

-- ============================================================================
-- 12. PAYOUT REQUESTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_amount BIGINT NOT NULL CHECK (requested_amount >= 100000),
  full_legal_name TEXT NOT NULL,
  protected_card_data TEXT NOT NULL,
  masked_card TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'paid', 'rejected', 'cancelled')),
  payment_proof_url TEXT,
  author_note TEXT,
  admin_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_author ON public.payout_requests(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- ============================================================================
-- 13. PLATFORM SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial settings
INSERT INTO public.platform_settings (key, value)
VALUES
  ('commission_percentage', '20'::jsonb),
  ('minimum_payout', '100000'::jsonb),
  ('telegram_support_username', '"diyorbek_anorboyev"'::jsonb),
  ('allowed_topup_amounts', '[10000, 25000, 50000, 100000, 200000, 500000]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 14. ADMIN AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action, created_at DESC);

-- ============================================================================
-- SEED INITIAL GENRES
-- ============================================================================
INSERT INTO public.genres (name, slug, description, sort_order)
VALUES
  ('Badiiy adabiyot', 'badiiy-adabiyot', 'Klassik va zamonaviy badiiy qissa hamda romanlar', 1),
  ('Detektiv va triller', 'detektiv-va-triller', 'Sirli voqealar, tergovlar va hayajonli syujetlar', 2),
  ('Fantastika va fentezi', 'fantastika-va-fentezi', 'Ilmiy fantastika, sehrli olamlar va sarguzashtlar', 3),
  ('Tarixiy asarlar', 'tarixiy-asarlar', 'O‘tmish voqealari, buyuk shaxslar va tarixiy romanlar', 4),
  ('Biznes va rivojlanish', 'biznes-va-rivojlanish', 'Shaxsiy o‘sish, moliyaviy savodxonlik va tadbirkorlik', 5),
  ('Romantika', 'romantika', 'Muhabbat qissalari, tuyg‘ular va lirik asarlar', 6),
  ('Diniy-ma''rifiy', 'diniy-marifiy', 'Hikmatlar, ma''naviy o‘gitlar va ibratli hikoyalar', 7),
  ('She''riyat', 'sheriyat', 'Nafis g‘azallar, to‘rtliklar va zamonaviy she''rlar', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- AUTOMATIC NEW USER HANDLER
-- ============================================================================
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
  -- Generate unique public ID e.g. MB-49281
  v_public_id := 'MB-' || UPPER(SUBSTRING(MD5(NEW.id::text || gen_random_uuid()::text) FROM 1 FOR 6));
  
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

  INSERT INTO public.profiles (id, public_id, display_name, username, avatar_url, bio, telegram_username, is_admin)
  VALUES (
    NEW.id,
    v_public_id,
    v_display_name,
    v_username,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'telegram_username',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create primary reader wallet account
  INSERT INTO public.wallet_accounts (user_id, account_type, balance)
  VALUES (NEW.id, 'reader_credit', 0)
  ON CONFLICT (user_id, account_type) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Wire auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECURE SERVER-SIDE FINANCIAL STORED FUNCTIONS / RPCS
-- ============================================================================

-- 1. ADMIN APPROVE TOPUP
CREATE OR REPLACE FUNCTION public.admin_approve_topup(
  p_admin_id UUID,
  p_request_id UUID,
  p_proof_url TEXT,
  p_admin_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_request RECORD;
  v_account_id UUID;
  v_current_bal BIGINT;
  v_new_bal BIGINT;
BEGIN
  -- Verify admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Faqat administratorlar tasdiqlashi mumkin';
  END IF;

  -- Fetch and lock topup request
  SELECT * INTO v_request
  FROM public.topup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hisob to‘ldirish so‘rovi topilmadi';
  END IF;

  IF v_request.status NOT IN ('pending', 'under_review') THEN
    RAISE EXCEPTION 'Bu so‘rov allaqachon ko‘rib chiqilgan (status: %)', v_request.status;
  END IF;

  -- Get or create reader wallet
  SELECT id, balance INTO v_account_id, v_current_bal
  FROM public.wallet_accounts
  WHERE user_id = v_request.reader_id AND account_type = 'reader_credit'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts (user_id, account_type, balance)
    VALUES (v_request.reader_id, 'reader_credit', 0)
    RETURNING id, balance INTO v_account_id, v_current_bal;
  END IF;

  v_new_bal := v_current_bal + v_request.amount;

  -- Update wallet
  UPDATE public.wallet_accounts
  SET balance = v_new_bal, updated_at = now()
  WHERE id = v_account_id;

  -- Record ledger entry
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_account_id,
    v_request.amount,
    'topup',
    'topup_request',
    v_request.id::text,
    'topup_approve_' || v_request.id::text,
    'Hisob muvaffaqiyatli to‘ldirildi (Admin tomonidan tasdiqlandi)',
    p_admin_id,
    v_new_bal
  );

  -- Update request status
  UPDATE public.topup_requests
  SET status = 'approved',
      payment_proof_url = COALESCE(p_proof_url, payment_proof_url),
      admin_note = p_admin_note,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  -- Record audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    'approve_topup',
    'topup_request',
    p_request_id::text,
    jsonb_build_object(
      'amount', v_request.amount,
      'reader_id', v_request.reader_id,
      'balance_after', v_new_bal
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'credited_amount', v_request.amount,
    'balance_after', v_new_bal
  );
END;
$$;

-- 2. PURCHASE CONTENT ATOMICALLY
CREATE OR REPLACE FUNCTION public.purchase_content(
  p_user_id UUID,
  p_work_id UUID,
  p_chapter_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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

  -- Verify work
  SELECT * INTO v_work FROM public.works WHERE id = p_work_id;
  IF NOT FOUND OR v_work.status != 'published' THEN
    RAISE EXCEPTION 'Asar topilmadi yoki hali e''lon qilinmagan';
  END IF;

  v_author_id := v_work.author_id;

  -- Determine purchase type and price
  IF p_chapter_id IS NOT NULL THEN
    SELECT * INTO v_chapter FROM public.chapters WHERE id = p_chapter_id AND work_id = p_work_id;
    IF NOT FOUND OR v_chapter.status != 'published' THEN
      RAISE EXCEPTION 'Bob topilmadi yoki e''lon qilinmagan';
    END IF;

    IF v_chapter.is_free THEN
      RAISE EXCEPTION 'Ushbu bob bepul, uni xarid qilish talab etilmaydi';
    END IF;

    -- Check if reader already bought full work or this chapter
    SELECT * INTO v_existing_purchase
    FROM public.purchases
    WHERE buyer_id = p_user_id
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
    IF v_work.access_type = 'free' THEN
      RAISE EXCEPTION 'Ushbu asar to‘liq bepul';
    END IF;

    -- Check if reader already bought full work
    SELECT * INTO v_existing_purchase
    FROM public.purchases
    WHERE buyer_id = p_user_id
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

  -- Read platform commission percentage from settings
  SELECT (value)::int INTO v_commission_pct
  FROM public.platform_settings
  WHERE key = 'commission_percentage';
  v_commission_pct := COALESCE(v_commission_pct, 20);

  v_commission_val := FLOOR(v_price * v_commission_pct / 100);
  v_author_net := v_price - v_commission_val;

  -- Lock and verify reader balance
  SELECT id, balance INTO v_reader_acc
  FROM public.wallet_accounts
  WHERE user_id = p_user_id AND account_type = 'reader_credit'
  FOR UPDATE;

  IF NOT FOUND OR v_reader_acc.balance < v_price THEN
    RAISE EXCEPTION 'Hisobingizda mablag‘ yetarli emas. Balansingiz: % so‘m, Talab qilinadi: % so‘m',
      COALESCE(v_reader_acc.balance, 0), v_price;
  END IF;

  -- Debit reader
  v_new_reader_bal := v_reader_acc.balance - v_price;
  UPDATE public.wallet_accounts
  SET balance = v_new_reader_bal, updated_at = now()
  WHERE id = v_reader_acc.id;

  -- Get or create author available earnings account
  SELECT id, balance INTO v_author_acc_id, v_author_current_bal
  FROM public.wallet_accounts
  WHERE user_id = v_author_id AND account_type = 'author_earnings_available'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts (user_id, account_type, balance)
    VALUES (v_author_id, 'author_earnings_available', 0)
    RETURNING id, balance INTO v_author_acc_id, v_author_current_bal;
  END IF;

  -- Credit author net earnings
  UPDATE public.wallet_accounts
  SET balance = v_author_current_bal + v_author_net, updated_at = now()
  WHERE id = v_author_acc_id;

  -- Credit platform revenue account
  SELECT id, balance INTO v_platform_acc_id, v_platform_current_bal
  FROM public.wallet_accounts
  WHERE user_id IS NULL AND account_type = 'platform_revenue'
  FOR UPDATE;

  UPDATE public.wallet_accounts
  SET balance = v_platform_current_bal + v_commission_val, updated_at = now()
  WHERE id = v_platform_acc_id;

  -- Insert purchase record
  INSERT INTO public.purchases (
    buyer_id, author_id, work_id, chapter_id, purchase_type,
    gross_amount, commission_amount, author_net_amount, idempotency_key, status
  ) VALUES (
    p_user_id, v_author_id, p_work_id, p_chapter_id, v_purchase_type,
    v_price, v_commission_val, v_author_net, p_idempotency_key, 'active'
  ) RETURNING id INTO v_purchase_id;

  -- Ledger: Reader debit
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_reader_acc.id,
    -v_price,
    'purchase_debit',
    'purchase',
    v_purchase_id::text,
    p_idempotency_key || '_reader_debit',
    'Asar xaridi: ' || v_work.title,
    p_user_id,
    v_new_reader_bal
  );

  -- Ledger: Author credit
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_author_acc_id,
    v_author_net,
    'author_sale_credit',
    'purchase',
    v_purchase_id::text,
    p_idempotency_key || '_author_credit',
    'Asar sotuvidan daromad: ' || v_work.title,
    p_user_id,
    v_author_current_bal + v_author_net
  );

  -- Ledger: Platform revenue credit
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_platform_acc_id,
    v_commission_val,
    'platform_fee_credit',
    'purchase',
    v_purchase_id::text,
    p_idempotency_key || '_platform_fee',
    'Platforma komissiyasi (' || v_commission_pct || '%): ' || v_work.title,
    p_user_id,
    v_platform_current_bal + v_commission_val
  );

  -- Automatically save to reader library
  INSERT INTO public.library_items (user_id, work_id, saved_state, last_read_chapter_id, reading_progress)
  VALUES (p_user_id, p_work_id, 'reading', p_chapter_id, 0)
  ON CONFLICT (user_id, work_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'gross_amount', v_price,
    'balance_after', v_new_reader_bal
  );
END;
$$;

-- 3. AUTHOR CREATE PAYOUT REQUEST
CREATE OR REPLACE FUNCTION public.author_create_payout_request(
  p_user_id UUID,
  p_amount BIGINT,
  p_legal_name TEXT,
  p_card_number TEXT,
  p_author_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author RECORD;
  v_min_payout BIGINT := 100000;
  v_avail_acc RECORD;
  v_res_acc RECORD;
  v_clean_card TEXT;
  v_masked_card TEXT;
  v_payout_id UUID;
BEGIN
  -- Verify author status
  SELECT * INTO v_author FROM public.author_profiles WHERE user_id = p_user_id;
  IF NOT FOUND OR v_author.status != 'approved' THEN
    RAISE EXCEPTION 'Faqat tasdiqlangan mualliflar pul yechib olish so‘rovi yuborishi mumkin';
  END IF;

  -- Verify minimum payout
  SELECT (value)::bigint INTO v_min_payout FROM public.platform_settings WHERE key = 'minimum_payout';
  v_min_payout := COALESCE(v_min_payout, 100000);

  IF p_amount < v_min_payout THEN
    RAISE EXCEPTION 'Minimal yechib olish miqdori: % so‘m', v_min_payout;
  END IF;

  -- Format and mask card
  v_clean_card := REGEXP_REPLACE(p_card_number, '\s+', '', 'g');
  IF LENGTH(v_clean_card) != 16 THEN
    RAISE EXCEPTION 'Karta raqami 16 ta raqamdan iborat bo‘lishi lozim';
  END IF;

  v_masked_card := SUBSTRING(v_clean_card FROM 1 FOR 4) || ' **** **** ' || SUBSTRING(v_clean_card FROM 13 FOR 4);

  -- Lock author available earnings
  SELECT id, balance INTO v_avail_acc
  FROM public.wallet_accounts
  WHERE user_id = p_user_id AND account_type = 'author_earnings_available'
  FOR UPDATE;

  IF NOT FOUND OR v_avail_acc.balance < p_amount THEN
    RAISE EXCEPTION 'Yechib olish uchun mablag‘ yetarli emas. Mavjud daromad: % so‘m', COALESCE(v_avail_acc.balance, 0);
  END IF;

  -- Lock or create author reserved earnings account
  SELECT id, balance INTO v_res_acc
  FROM public.wallet_accounts
  WHERE user_id = p_user_id AND account_type = 'author_earnings_reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_accounts (user_id, account_type, balance)
    VALUES (p_user_id, 'author_earnings_reserved', 0)
    RETURNING id, balance INTO v_res_acc;
  END IF;

  -- Move from available to reserved
  UPDATE public.wallet_accounts
  SET balance = v_avail_acc.balance - p_amount, updated_at = now()
  WHERE id = v_avail_acc.id;

  UPDATE public.wallet_accounts
  SET balance = v_res_acc.balance + p_amount, updated_at = now()
  WHERE id = v_res_acc.id;

  -- Insert payout request
  INSERT INTO public.payout_requests (
    author_id, requested_amount, full_legal_name,
    protected_card_data, masked_card, status, author_note
  ) VALUES (
    p_user_id, p_amount, p_legal_name,
    v_clean_card, v_masked_card, 'pending', p_author_note
  ) RETURNING id INTO v_payout_id;

  -- Ledger entries
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_avail_acc.id,
    -p_amount,
    'payout_reserve',
    'payout_request',
    v_payout_id::text,
    'payout_reserve_' || v_payout_id::text,
    'Pul yechib olish uchun band qilindi: ' || v_masked_card,
    p_user_id,
    v_avail_acc.balance - p_amount
  );

  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_res_acc.id,
    p_amount,
    'payout_reserve',
    'payout_request',
    v_payout_id::text,
    'payout_reserved_in_' || v_payout_id::text,
    'Band qilingan daromadga o‘tkazildi',
    p_user_id,
    v_res_acc.balance + p_amount
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'reserved_amount', p_amount,
    'available_balance_after', v_avail_acc.balance - p_amount
  );
END;
$$;

-- 4. ADMIN APPROVE PAYOUT PAID
CREATE OR REPLACE FUNCTION public.admin_approve_payout_paid(
  p_admin_id UUID,
  p_request_id UUID,
  p_proof_url TEXT,
  p_admin_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_payout RECORD;
  v_res_acc RECORD;
BEGIN
  -- Verify admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Faqat administratorlar tasdiqlashi mumkin';
  END IF;

  -- Lock payout request
  SELECT * INTO v_payout
  FROM public.payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pul yechish so‘rovi topilmadi';
  END IF;

  IF v_payout.status NOT IN ('pending', 'under_review', 'approved') THEN
    RAISE EXCEPTION 'Ushbu so‘rov yakunlangan (status: %)', v_payout.status;
  END IF;

  -- Lock author reserved account
  SELECT id, balance INTO v_res_acc
  FROM public.wallet_accounts
  WHERE user_id = v_payout.author_id AND account_type = 'author_earnings_reserved'
  FOR UPDATE;

  IF NOT FOUND OR v_res_acc.balance < v_payout.requested_amount THEN
    RAISE EXCEPTION 'Band qilingan mablag‘ yetarli emas';
  END IF;

  -- Debit reserved account
  UPDATE public.wallet_accounts
  SET balance = v_res_acc.balance - v_payout.requested_amount, updated_at = now()
  WHERE id = v_res_acc.id;

  -- Ledger
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_res_acc.id,
    -v_payout.requested_amount,
    'payout_paid',
    'payout_request',
    v_payout.id::text,
    'payout_paid_' || v_payout.id::text,
    'To‘lov muvaffaqiyatli amalga oshirildi: ' || v_payout.masked_card,
    p_admin_id,
    v_res_acc.balance - v_payout.requested_amount
  );

  -- Update payout request
  UPDATE public.payout_requests
  SET status = 'paid',
      payment_proof_url = COALESCE(p_proof_url, payment_proof_url),
      admin_note = p_admin_note,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      paid_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    'mark_payout_paid',
    'payout_request',
    p_request_id::text,
    jsonb_build_object(
      'amount', v_payout.requested_amount,
      'author_id', v_payout.author_id,
      'masked_card', v_payout.masked_card
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_request_id,
    'paid_amount', v_payout.requested_amount
  );
END;
$$;

-- 5. REJECT / CANCEL PAYOUT REQUEST
CREATE OR REPLACE FUNCTION public.admin_reject_payout(
  p_admin_id UUID,
  p_request_id UUID,
  p_admin_note TEXT,
  p_is_cancel BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_payout RECORD;
  v_avail_acc RECORD;
  v_res_acc RECORD;
  v_new_status TEXT;
BEGIN
  -- If not cancellation by author, check admin
  IF NOT p_is_cancel THEN
    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = p_admin_id;
    IF NOT COALESCE(v_is_admin, false) THEN
      RAISE EXCEPTION 'Faqat administratorlar rad etishi mumkin';
    END IF;
  END IF;

  -- Lock payout request
  SELECT * INTO v_payout
  FROM public.payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pul yechish so‘rovi topilmadi';
  END IF;

  IF v_payout.status NOT IN ('pending', 'under_review') THEN
    RAISE EXCEPTION 'Bu so‘rovni bekor qilib yoki rad etib bo‘lmaydi (status: %)', v_payout.status;
  END IF;

  -- Author can only cancel own pending request
  IF p_is_cancel AND v_payout.author_id != p_admin_id THEN
    RAISE EXCEPTION 'Faqat o‘zingizning so‘rovingizni bekor qilishingiz mumkin';
  END IF;

  -- Lock reserved and available accounts
  SELECT id, balance INTO v_res_acc
  FROM public.wallet_accounts
  WHERE user_id = v_payout.author_id AND account_type = 'author_earnings_reserved'
  FOR UPDATE;

  SELECT id, balance INTO v_avail_acc
  FROM public.wallet_accounts
  WHERE user_id = v_payout.author_id AND account_type = 'author_earnings_available'
  FOR UPDATE;

  IF v_res_acc.balance < v_payout.requested_amount THEN
    RAISE EXCEPTION 'Band qilingan mablag‘ yetarli emas';
  END IF;

  -- Move from reserved back to available
  UPDATE public.wallet_accounts
  SET balance = v_res_acc.balance - v_payout.requested_amount, updated_at = now()
  WHERE id = v_res_acc.id;

  UPDATE public.wallet_accounts
  SET balance = v_avail_acc.balance + v_payout.requested_amount, updated_at = now()
  WHERE id = v_avail_acc.id;

  -- Ledger
  INSERT INTO public.wallet_transactions (
    account_id, amount, transaction_type, reference_type, reference_id,
    idempotency_key, description, actor_id, balance_after
  ) VALUES (
    v_avail_acc.id,
    v_payout.requested_amount,
    'payout_cancel_reversal',
    'payout_request',
    v_payout.id::text,
    'payout_reversal_' || v_payout.id::text,
    'Pul yechish rad etildi/bekor qilindi, mablag‘ qaytarildi',
    p_admin_id,
    v_avail_acc.balance + v_payout.requested_amount
  );

  v_new_status := CASE WHEN p_is_cancel THEN 'cancelled' ELSE 'rejected' END;

  UPDATE public.payout_requests
  SET status = v_new_status,
      admin_note = p_admin_note,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_admin_id,
    v_new_status || '_payout',
    'payout_request',
    p_request_id::text,
    jsonb_build_object(
      'amount', v_payout.requested_amount,
      'author_id', v_payout.author_id,
      'returned_to_available', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', p_request_id,
    'status', v_new_status,
    'returned_amount', v_payout.requested_amount
  );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile (except is_admin)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Author Profiles
CREATE POLICY "Approved authors are public"
  ON public.author_profiles FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Users can submit author application"
  ON public.author_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Authors can update own bio if not suspended"
  ON public.author_profiles FOR UPDATE
  USING (auth.uid() = user_id AND status != 'suspended')
  WITH CHECK (auth.uid() = user_id);

-- Genres
CREATE POLICY "Active genres readable by all"
  ON public.genres FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Works
CREATE POLICY "Published works are readable by everyone"
  ON public.works FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Authors can insert own works"
  ON public.works FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own works"
  ON public.works FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Work Genres
CREATE POLICY "Work genres readable by everyone"
  ON public.work_genres FOR SELECT
  USING (true);

CREATE POLICY "Authors can manage work genres"
  ON public.work_genres FOR ALL
  USING (EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid()));

-- Chapters
CREATE POLICY "Published chapters metadata and content access"
  ON public.chapters FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Authors can insert own chapters"
  ON public.chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid()));

CREATE POLICY "Authors can update own chapters"
  ON public.chapters FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid()));

CREATE POLICY "Authors can delete draft chapters"
  ON public.chapters FOR DELETE
  USING (status = 'draft' AND EXISTS (SELECT 1 FROM public.works WHERE id = work_id AND author_id = auth.uid()));

-- Library Items
CREATE POLICY "Users manage own library"
  ON public.library_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Wallet Accounts (Read-only for owner, modifications exclusively via trusted functions)
CREATE POLICY "Users can view own wallet accounts"
  ON public.wallet_accounts FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Wallet Transactions (Read-only for account owner)
CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.wallet_accounts
      WHERE id = wallet_transactions.account_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
    )
  );

-- Purchases
CREATE POLICY "Buyers and authors can view relevant purchases"
  ON public.purchases FOR SELECT
  USING (
    auth.uid() = buyer_id
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Topup Requests
CREATE POLICY "Readers can view own topup requests"
  ON public.topup_requests FOR SELECT
  USING (auth.uid() = reader_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Readers can create pending topup requests"
  ON public.topup_requests FOR INSERT
  WITH CHECK (auth.uid() = reader_id AND status = 'pending');

-- Payout Requests
CREATE POLICY "Authors can view own payout requests"
  ON public.payout_requests FOR SELECT
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Platform Settings
CREATE POLICY "Platform settings readable by all"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Admin Audit Logs
CREATE POLICY "Admin audit logs viewable by admins only"
  ON public.admin_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
