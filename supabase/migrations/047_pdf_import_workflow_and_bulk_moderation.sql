-- Move PDF imports into the normal work editor and approve a whole imported book atomically.
ALTER TABLE public.pdf_import_sessions
  ADD COLUMN IF NOT EXISTS chat_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Repair the exact legacy failure: the old moderation endpoint could publish a
-- work while chapters from a completed PDF import remained draft. Scope the
-- repair to works that have a completed importer session; ordinary drafts are
-- not touched.
WITH completed_imports AS (
  SELECT DISTINCT work_id
  FROM public.pdf_import_sessions
  WHERE status = 'completed' AND work_id IS NOT NULL
)
UPDATE public.chapters AS chapter
SET status = 'published',
    published_at = coalesce(chapter.published_at, now()),
    updated_at = now()
FROM completed_imports AS imported
JOIN public.works AS work ON work.id = imported.work_id
WHERE chapter.work_id = imported.work_id
  AND work.status = 'published'
  AND chapter.status = 'draft';

-- A completed import attached to a still-draft work must appear in the normal
-- moderation queue, so the admin can approve the whole book once.
WITH completed_imports AS (
  SELECT DISTINCT work_id
  FROM public.pdf_import_sessions
  WHERE status = 'completed' AND work_id IS NOT NULL
)
UPDATE public.works AS work
SET status = 'pending_review', updated_at = now()
FROM completed_imports AS imported
WHERE work.id = imported.work_id
  AND work.status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.chapters AS chapter
    WHERE chapter.work_id = work.id AND chapter.status = 'draft'
  );

-- Replace the importer while keeping the existing five-argument API signature.
CREATE OR REPLACE FUNCTION public.admin_import_pdf_chapters(
  p_session_id uuid,
  p_admin_id uuid,
  p_work_id uuid,
  p_chapters jsonb,
  p_author_name text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.pdf_import_sessions%ROWTYPE;
  v_item jsonb;
  v_work_status text;
  v_chapter_status text;
  v_existing_max integer;
  v_chapter_id uuid;
  v_count integer := 0;
  v_author_name text := btrim(p_author_name);
BEGIN
  IF char_length(v_author_name) < 2 OR char_length(v_author_name) > 160 THEN
    RAISE EXCEPTION 'INVALID_AUTHOR_NAME';
  END IF;

  SELECT * INTO v_session
    FROM public.pdf_import_sessions
    WHERE id = p_session_id AND created_by = p_admin_id
    FOR UPDATE;
  IF NOT FOUND OR v_session.expires_at <= now() THEN
    RAISE EXCEPTION 'IMPORT_SESSION_NOT_FOUND';
  END IF;
  IF v_session.status NOT IN ('needs_review','ready') THEN
    RAISE EXCEPTION 'IMPORT_SESSION_NOT_READY';
  END IF;
  IF coalesce((v_session.statistics->>'coverage')::numeric, 0) < 1
     OR length(v_session.unassigned_text) > 0 THEN
    RAISE EXCEPTION 'IMPORT_INTEGRITY_FAILED';
  END IF;

  SELECT status INTO v_work_status
    FROM public.works
    WHERE id = p_work_id
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;

  -- A new book enters moderation as one unit. An admin-only import appended to
  -- an already published book can be published atomically without hiding it.
  v_chapter_status := CASE WHEN v_work_status = 'published' THEN 'published' ELSE 'draft' END;

  UPDATE public.pdf_import_sessions
    SET status = 'importing', updated_at = now()
    WHERE id = p_session_id;
  UPDATE public.works
    SET credited_author_name = v_author_name, updated_at = now()
    WHERE id = p_work_id;

  SELECT coalesce(max(chapter_number), 0) INTO v_existing_max
    FROM public.chapters
    WHERE work_id = p_work_id AND status <> 'archived';

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_chapters) LOOP
    IF nullif(trim(v_item->>'title'), '') IS NULL
       OR nullif(trim(v_item->>'content'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_CHAPTER';
    END IF;

    INSERT INTO public.chapters(
      work_id, chapter_number, title, slug, is_free, is_preview_free,
      price, status, published_at, created_at, updated_at
    ) VALUES (
      p_work_id,
      v_existing_max + v_count + 1,
      trim(v_item->>'title'),
      trim(both '-' from regexp_replace(lower(trim(v_item->>'title')), '[^a-z0-9]+', '-', 'g'))
        || '-' || (v_existing_max + v_count + 1),
      false,
      false,
      0,
      v_chapter_status,
      CASE WHEN v_chapter_status = 'published' THEN now() ELSE NULL END,
      now(),
      now()
    ) RETURNING id INTO v_chapter_id;

    INSERT INTO public.chapter_contents(chapter_id, content, updated_at)
      VALUES (v_chapter_id, v_item->>'content', now());
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN RAISE EXCEPTION 'NO_CHAPTERS'; END IF;

  IF v_work_status <> 'published' THEN
    UPDATE public.works
      SET status = 'pending_review', rejection_reason = NULL, updated_at = now()
      WHERE id = p_work_id;
  END IF;

  UPDATE public.pdf_import_sessions
    SET status = 'completed', work_id = p_work_id, updated_at = now()
    WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'imported', v_count,
    'startChapterNumber', v_existing_max + 1,
    'creditedAuthorName', v_author_name,
    'workStatus', CASE WHEN v_work_status = 'published' THEN 'published' ELSE 'pending_review' END,
    'chaptersStatus', v_chapter_status
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb,text)
  TO service_role;

-- Work approval and every draft chapter publication happen in one transaction.
CREATE OR REPLACE FUNCTION public.admin_approve_work_with_chapters(
  p_work_id uuid,
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_published_chapters integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND (is_admin = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'ADMIN_REQUIRED';
  END IF;

  PERFORM 1 FROM public.works WHERE id = p_work_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;

  UPDATE public.chapters
    SET status = 'published',
        published_at = coalesce(published_at, now()),
        updated_at = now()
    WHERE work_id = p_work_id AND status = 'draft';

  SELECT count(*) INTO v_published_chapters
    FROM public.chapters
    WHERE work_id = p_work_id AND status = 'published';
  IF v_published_chapters = 0 THEN RAISE EXCEPTION 'NO_PUBLISHED_CHAPTERS'; END IF;

  UPDATE public.works
    SET status = 'published',
        published_at = coalesce(published_at, now()),
        rejection_reason = NULL,
        updated_at = now()
    WHERE id = p_work_id;

  RETURN jsonb_build_object(
    'workId', p_work_id,
    'publishedChapters', v_published_chapters
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_approve_work_with_chapters(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_work_with_chapters(uuid,uuid)
  TO service_role;
