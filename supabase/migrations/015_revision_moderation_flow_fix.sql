-- ============================================================================
-- 015_revision_moderation_flow_fix.sql
-- MANBORA PLATFORM: REVISION MODERATION PIPELINE, STATUS NORMALIZATION & ATOMIC PROMOTIONS
-- ============================================================================

-- 1. NORMALIZE EXISTING DRAFT OR UNSET REVISIONS TO CANONICAL 'pending_review'
-- This ensures any revision previously created by authors that was marked as 'draft'
-- or had unset status is now visible in the admin moderation dashboard (/diyoration/tahrirlar).
-- Note: 'approved' and 'rejected' revisions are strictly preserved and untouched.

UPDATE public.work_revisions
SET status = 'pending_review',
    updated_at = timezone('utc'::text, now())
WHERE status = 'draft' OR status IS NULL;

UPDATE public.chapter_revisions
SET status = 'pending_review',
    updated_at = timezone('utc'::text, now())
WHERE status = 'draft' OR status IS NULL;

-- 2. ENSURE COMPREHENSIVE PERFORMANCE & FILTERING INDEXES
CREATE INDEX IF NOT EXISTS idx_work_revisions_status_created 
  ON public.work_revisions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapter_revisions_status_created 
  ON public.chapter_revisions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_revisions_work_author 
  ON public.work_revisions(work_id, author_id, status);

CREATE INDEX IF NOT EXISTS idx_chapter_revisions_chapter_author 
  ON public.chapter_revisions(chapter_id, author_id, status);

-- 3. ATOMIC WORK REVISION APPROVAL RPC FUNCTION
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
  
  -- If invoked from authenticated user session, verify admin flag.
  -- If invoked via service_role / superuser context, auth.uid() is null and execution is trusted.
  IF v_caller_id IS NOT NULL THEN
    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
    IF v_is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'Faqat administrator tahrirni tasdiqlashi mumkin';
    END IF;
  END IF;

  SELECT * INTO v_rev FROM public.work_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tahrir yozuvi topilmadi';
  END IF;

  IF v_rev.status != 'pending_review' THEN
    RAISE EXCEPTION 'Ushbu tahrir allaqachon ko‘rib chiqilgan (holati: %)', v_rev.status;
  END IF;

  -- Atomically apply proposed revision to live works record
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
      moderator_id = COALESCE(v_caller_id, moderator_id),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object('success', true, 'work_id', v_rev.work_id, 'revision_id', p_revision_id);
END;
$$;

-- 4. ATOMIC CHAPTER REVISION APPROVAL RPC FUNCTION
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
  
  IF v_caller_id IS NOT NULL THEN
    SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_caller_id;
    IF v_is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'Faqat administrator bob tahririni tasdiqlashi mumkin';
    END IF;
  END IF;

  SELECT * INTO v_rev FROM public.chapter_revisions WHERE id = p_revision_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bob tahrir yozuvi topilmadi';
  END IF;

  IF v_rev.status != 'pending_review' THEN
    RAISE EXCEPTION 'Ushbu bob tahriri allaqachon ko‘rib chiqilgan (holati: %)', v_rev.status;
  END IF;

  -- Atomically apply proposed chapter revision to live chapters and chapter_contents
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

  -- Mark chapter revision as approved
  UPDATE public.chapter_revisions
  SET status = 'approved',
      moderator_id = COALESCE(v_caller_id, moderator_id),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object('success', true, 'chapter_id', v_rev.chapter_id, 'revision_id', p_revision_id);
END;
$$;
