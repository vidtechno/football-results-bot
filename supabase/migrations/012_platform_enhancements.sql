-- ============================================================================
-- 012_platform_enhancements.sql
-- MANBORA PLATFORM ENHANCEMENTS: REVISIONS SYSTEM, ATOMIC CHAPTER REORDER,
-- READING PREFERENCES, SECURE STORAGE & PERFORMANCE INDEXES
-- ============================================================================

-- 1. ADD ARCHIVE & SOFT-DELETION FIELDS TO WORKS
ALTER TABLE public.works 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_revision JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_works_is_archived ON public.works(is_archived);
CREATE INDEX IF NOT EXISTS idx_works_author_archived ON public.works(author_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_works_author_status ON public.works(author_id, status);

-- 2. WORK REVISIONS TABLE (For published works editorial changes)
CREATE TABLE IF NOT EXISTS public.work_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('book', 'serialized_story')),
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('free', 'paid_full_work', 'paid_by_chapter')),
  full_work_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (full_work_price >= 0),
  age_rating VARCHAR(10) NOT NULL DEFAULT '0+',
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_work_revisions_work ON public.work_revisions(work_id);
CREATE INDEX IF NOT EXISTS idx_work_revisions_author ON public.work_revisions(author_id);
CREATE INDEX IF NOT EXISTS idx_work_revisions_status ON public.work_revisions(status);

-- 3. CHAPTER REVISIONS TABLE (For published chapters editorial changes)
CREATE TABLE IF NOT EXISTS public.chapter_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_free BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chapter_revisions_chapter ON public.chapter_revisions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_revisions_work ON public.chapter_revisions(work_id);
CREATE INDEX IF NOT EXISTS idx_chapter_revisions_status ON public.chapter_revisions(status);

-- Enable RLS on revisions tables
ALTER TABLE public.work_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_revisions ENABLE ROW LEVEL SECURITY;

-- Work revisions policies
DROP POLICY IF EXISTS "Authors can view own work revisions" ON public.work_revisions;
CREATE POLICY "Authors can view own work revisions"
  ON public.work_revisions FOR SELECT
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Authors can create own work revisions" ON public.work_revisions;
CREATE POLICY "Authors can create own work revisions"
  ON public.work_revisions FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update draft work revisions" ON public.work_revisions;
CREATE POLICY "Authors can update draft work revisions"
  ON public.work_revisions FOR UPDATE
  USING ((author_id = auth.uid() AND status IN ('draft', 'pending_review')) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Chapter revisions policies
DROP POLICY IF EXISTS "Authors can view own chapter revisions" ON public.chapter_revisions;
CREATE POLICY "Authors can view own chapter revisions"
  ON public.chapter_revisions FOR SELECT
  USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Authors can create own chapter revisions" ON public.chapter_revisions;
CREATE POLICY "Authors can create own chapter revisions"
  ON public.chapter_revisions FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update draft chapter revisions" ON public.chapter_revisions;
CREATE POLICY "Authors can update draft chapter revisions"
  ON public.chapter_revisions FOR UPDATE
  USING ((author_id = auth.uid() AND status IN ('draft', 'pending_review')) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 4. ATOMIC CHAPTER REORDERING RPC FUNCTION
CREATE OR REPLACE FUNCTION public.reorder_chapters(
  p_work_id UUID,
  p_chapter_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_work_author_id UUID;
  v_total_chapters INT;
  v_input_count INT;
  v_foreign_count INT;
  v_idx INT;
  v_chapter_id UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- 1. Check authentication
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Foydalanuvchi tizimga kirmagan';
  END IF;

  -- 2. Verify work exists and check permissions
  SELECT author_id INTO v_work_author_id FROM public.works WHERE id = p_work_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asar topilmadi';
  END IF;

  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF v_work_author_id != v_caller_id AND (v_is_admin IS NOT TRUE) THEN
    RAISE EXCEPTION 'Faqat asar muallifi yoki administrator boblar tartibini o‘zgartirishi mumkin';
  END IF;

  -- 3. Verify counts
  v_input_count := array_length(p_chapter_ids, 1);
  IF v_input_count IS NULL OR v_input_count = 0 THEN
    RAISE EXCEPTION 'Boblar ro‘yxati bo‘sh bo‘lishi mumkin emas';
  END IF;

  SELECT COUNT(*) INTO v_total_chapters FROM public.chapters WHERE work_id = p_work_id;
  IF v_total_chapters != v_input_count THEN
    RAISE EXCEPTION 'Taqdim etilgan boblar soni (% ta) mavjud boblar soniga (% ta) teng emas', v_input_count, v_total_chapters;
  END IF;

  -- 4. Verify all IDs belong to this work (no foreign or duplicate IDs)
  SELECT COUNT(*) INTO v_foreign_count 
  FROM unnest(p_chapter_ids) AS id_item
  WHERE id_item NOT IN (SELECT id FROM public.chapters WHERE work_id = p_work_id);

  IF v_foreign_count > 0 THEN
    RAISE EXCEPTION 'Boblar ro‘yxatida begona yoki noto‘g‘ri identifikatorlar mavjud';
  END IF;

  -- 5. Phase 1: Temporary offset to avoid unique constraint collision
  v_idx := 1;
  FOREACH v_chapter_id IN ARRAY p_chapter_ids LOOP
    UPDATE public.chapters
    SET chapter_number = 100000 + v_idx,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_chapter_id AND work_id = p_work_id;
    v_idx := v_idx + 1;
  END LOOP;

  -- 6. Phase 2: Final consecutive assignment (1..N)
  v_idx := 1;
  FOREACH v_chapter_id IN ARRAY p_chapter_ids LOOP
    UPDATE public.chapters
    SET chapter_number = v_idx,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_chapter_id AND work_id = p_work_id;
    v_idx := v_idx + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'work_id', p_work_id,
    'reordered_count', v_input_count
  );
END;
$$;

-- 5. ATOMIC REVISION PROMOTION RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.approve_work_revision(
  p_revision_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_rev public.work_revisions%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Faqat administrator tahrirni tasdiqlashi mumkin';
  END IF;

  SELECT * INTO v_rev FROM public.work_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tahrir yozuvi topilmadi';
  END IF;

  IF v_rev.status != 'pending_review' THEN
    RAISE EXCEPTION 'Ushbu tahrir allaqachon ko‘rib chiqilgan (holati: %)', v_rev.status;
  END IF;

  -- Atomically apply revision to live works table
  UPDATE public.works
  SET title = v_rev.title,
      description = v_rev.description,
      cover_url = COALESCE(v_rev.cover_url, cover_url),
      type = v_rev.type,
      access_type = v_rev.access_type,
      full_work_price = v_rev.full_work_price,
      age_rating = v_rev.age_rating,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_rev.work_id;

  -- Mark revision as approved
  UPDATE public.work_revisions
  SET status = 'approved',
      moderator_id = v_caller_id,
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object('success', true, 'work_id', v_rev.work_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_chapter_revision(
  p_revision_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := false;
  v_rev public.chapter_revisions%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Faqat administrator bob tahririni tasdiqlashi mumkin';
  END IF;

  SELECT * INTO v_rev FROM public.chapter_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bob tahrir yozuvi topilmadi';
  END IF;

  IF v_rev.status != 'pending_review' THEN
    RAISE EXCEPTION 'Ushbu bob tahriri allaqachon ko‘rib chiqilgan (holati: %)', v_rev.status;
  END IF;

  -- Atomically apply chapter revision to chapters & chapter_contents
  UPDATE public.chapters
  SET title = v_rev.title,
      is_free = v_rev.is_free,
      price = v_rev.price,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_rev.chapter_id;

  UPDATE public.chapter_contents
  SET content = v_rev.content,
      updated_at = timezone('utc'::text, now())
  WHERE chapter_id = v_rev.chapter_id;

  -- Mark revision as approved
  UPDATE public.chapter_revisions
  SET status = 'approved',
      moderator_id = v_caller_id,
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object('success', true, 'chapter_id', v_rev.chapter_id);
END;
$$;

-- 6. PROFILES READING PREFERENCES & SEARCH INDEXES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_preferences JSONB DEFAULT '{"theme":"light","fontFamily":"serif","fontSize":18,"lineHeight":"relaxed","contentWidth":"medium"}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lookup ON public.profiles(username);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chapters_work_slug ON public.chapters(work_id, slug);
CREATE INDEX IF NOT EXISTS idx_chapters_work_num_published ON public.chapters(work_id, chapter_number) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_works_published_covering ON public.works(published_at DESC) WHERE status = 'published' AND is_archived = false;

-- 7. STORAGE BUCKET: QUARANTINE UPLOADS
INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine-uploads', 'quarantine-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policies for quarantine-uploads
DROP POLICY IF EXISTS "Authenticated users can upload to quarantine" ON storage.objects;
CREATE POLICY "Authenticated users can upload to quarantine"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quarantine-uploads' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own quarantine files" ON storage.objects;
CREATE POLICY "Users can read own quarantine files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quarantine-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own quarantine files" ON storage.objects;
CREATE POLICY "Users can delete own quarantine files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'quarantine-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
