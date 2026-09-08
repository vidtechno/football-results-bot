-- ============================================================================
-- 029_completion_revision_and_performance_fixes.sql
-- MANBORA PLATFORM: WORK COMPLETION STATUS REVISIONS, GENRE MODERATION & QUERY OPTIMIZATION
-- ============================================================================

-- 1. ADD COMPLETION_STATUS AND GENRE_IDS TO WORK_REVISIONS
ALTER TABLE public.work_revisions
ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT NULL
CHECK (completion_status IS NULL OR completion_status IN ('ongoing', 'completed'));

ALTER TABLE public.work_revisions
ADD COLUMN IF NOT EXISTS genre_ids UUID[] DEFAULT NULL;

-- 2. CREATE OR REPLACE ATOMIC WORK REVISION APPROVAL RPC FUNCTION
-- Atomically applies approved title, description, cover, type, access_type, full_work_price,
-- age_rating, completion_status (if proposed), and genre_ids (if proposed).
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
  v_work_slug TEXT;
  v_prev_completion_status TEXT;
  v_new_completion_status TEXT;
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

  -- Fetch current live work metadata
  SELECT slug, completion_status INTO v_work_slug, v_prev_completion_status
  FROM public.works
  WHERE id = v_rev.work_id;

  -- Determine final completion status: if revision proposed one, use it; otherwise preserve current
  IF v_rev.completion_status IS NOT NULL THEN
    v_new_completion_status := v_rev.completion_status;
  ELSE
    v_new_completion_status := COALESCE(v_prev_completion_status, 'ongoing');
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
      completion_status = v_new_completion_status,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_rev.work_id;

  -- Atomically apply proposed genres if present in revision
  IF v_rev.genre_ids IS NOT NULL AND array_length(v_rev.genre_ids, 1) > 0 THEN
    DELETE FROM public.work_genres WHERE work_id = v_rev.work_id;
    INSERT INTO public.work_genres (work_id, genre_id)
    SELECT v_rev.work_id, unnest(v_rev.genre_ids);
  END IF;

  -- Mark revision as approved
  UPDATE public.work_revisions
  SET status = 'approved',
      moderator_id = COALESCE(v_caller_id, moderator_id),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object(
    'success', true,
    'work_id', v_rev.work_id,
    'revision_id', p_revision_id,
    'slug', v_work_slug,
    'prev_completion_status', v_prev_completion_status,
    'new_completion_status', v_new_completion_status
  );
END;
$$;

-- 3. AGGREGATE PUBLIC WORK STATS FUNCTION
-- Replaces 5 separate count queries with a single atomic aggregation.
CREATE OR REPLACE FUNCTION public.get_work_public_stats(
  p_work_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_views BIGINT := 0;
  v_readers BIGINT := 0;
  v_bookmarks BIGINT := 0;
  v_completed BIGINT := 0;
  v_followers BIGINT := 0;
BEGIN
  -- Unique authenticated views
  SELECT COUNT(*) INTO v_views
  FROM public.work_views
  WHERE work_id = p_work_id;

  -- Active readers
  SELECT COUNT(*) INTO v_readers
  FROM public.reading_progress
  WHERE work_id = p_work_id;

  -- Saved bookmarks
  SELECT COUNT(*) INTO v_bookmarks
  FROM public.reading_bookmarks
  WHERE work_id = p_work_id;

  -- Completed reads (percentage >= 100 or is_completed = true)
  SELECT COUNT(*) INTO v_completed
  FROM public.reading_progress
  WHERE work_id = p_work_id AND (percentage >= 100 OR is_completed = true);

  -- Work followers
  SELECT COUNT(*) INTO v_followers
  FROM public.work_follows
  WHERE work_id = p_work_id;

  RETURN jsonb_build_object(
    'views', v_views,
    'readers', v_readers,
    'bookmarks', v_bookmarks,
    'completed', v_completed,
    'followers', v_followers
  );
END;
$$;
