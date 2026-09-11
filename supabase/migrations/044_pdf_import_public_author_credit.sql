-- Separate public author attribution from the internal admin/uploader account.
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS credited_author_name text;

COMMENT ON COLUMN public.works.credited_author_name IS
  'Plain public author credit. When set, public UI must not link the work to the internal uploader profile.';

DO $$ BEGIN
  ALTER TABLE public.works
    ADD CONSTRAINT works_credited_author_name_check CHECK (
      credited_author_name IS NULL OR char_length(btrim(credited_author_name)) BETWEEN 2 AND 160
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Disable the previous four-argument importer; the public credit is now mandatory.
REVOKE ALL ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

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
  v_existing_max integer;
  v_chapter_id uuid;
  v_count integer := 0;
  v_author_name text := btrim(p_author_name);
BEGIN
  IF char_length(v_author_name) < 2 OR char_length(v_author_name) > 160 THEN
    RAISE EXCEPTION 'INVALID_AUTHOR_NAME';
  END IF;

  SELECT * INTO v_session FROM public.pdf_import_sessions
    WHERE id = p_session_id AND created_by = p_admin_id FOR UPDATE;
  IF NOT FOUND OR v_session.expires_at <= now() THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_FOUND'; END IF;
  IF v_session.status NOT IN ('needs_review','ready') THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_READY'; END IF;
  IF coalesce((v_session.statistics->>'coverage')::numeric, 0) < 1
     OR length(v_session.unassigned_text) > 0 THEN RAISE EXCEPTION 'IMPORT_INTEGRITY_FAILED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.works WHERE id = p_work_id) THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;

  UPDATE public.pdf_import_sessions SET status = 'importing', updated_at = now() WHERE id = p_session_id;
  UPDATE public.works
    SET credited_author_name = v_author_name, updated_at = now()
    WHERE id = p_work_id;

  SELECT coalesce(max(chapter_number), 0) INTO v_existing_max
    FROM public.chapters WHERE work_id = p_work_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_chapters) LOOP
    IF nullif(trim(v_item->>'title'), '') IS NULL OR nullif(trim(v_item->>'content'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_CHAPTER';
    END IF;
    INSERT INTO public.chapters(
      work_id, chapter_number, title, slug, is_free, is_preview_free, price, status, created_at, updated_at
    ) VALUES (
      p_work_id, v_existing_max + v_count + 1, trim(v_item->>'title'),
      trim(both '-' from regexp_replace(lower(trim(v_item->>'title')), '[^a-z0-9]+', '-', 'g')) || '-' || (v_existing_max + v_count + 1),
      false, false, 0, 'draft', now(), now()
    ) RETURNING id INTO v_chapter_id;
    INSERT INTO public.chapter_contents(chapter_id, content, updated_at)
      VALUES (v_chapter_id, v_item->>'content', now());
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN RAISE EXCEPTION 'NO_CHAPTERS'; END IF;
  UPDATE public.pdf_import_sessions
    SET status = 'completed', work_id = p_work_id, updated_at = now()
    WHERE id = p_session_id;
  RETURN jsonb_build_object(
    'imported', v_count,
    'startChapterNumber', v_existing_max + 1,
    'creditedAuthorName', v_author_name
  );
END; $$;

REVOKE ALL ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb,text)
  TO service_role;

