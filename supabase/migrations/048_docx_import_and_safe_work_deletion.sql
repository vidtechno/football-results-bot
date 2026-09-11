-- Remove the retired PDF book-import infrastructure. Imported works/chapters
-- remain intact; only temporary PDF sessions and their RPCs are removed.
DROP FUNCTION IF EXISTS public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb);
DROP FUNCTION IF EXISTS public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb,text);
DROP FUNCTION IF EXISTS public.cleanup_expired_pdf_import_sessions();
DROP TABLE IF EXISTS public.pdf_import_sessions;

-- DOCX-only book import sessions. The source file is never persisted; only the
-- reviewed structural preview and integrity metadata are retained temporarily.
CREATE TABLE IF NOT EXISTS public.document_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  file_hash text NOT NULL,
  status text NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('needs_review','ready','importing','completed','failed')),
  raw_text text NOT NULL,
  expected_body_text text NOT NULL,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  statistics jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (created_by, work_id, file_hash)
);

ALTER TABLE public.document_import_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_import_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.document_import_sessions TO service_role;

CREATE INDEX IF NOT EXISTS idx_document_import_sessions_owner_expiry
  ON public.document_import_sessions(created_by, expires_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_expired_document_import_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.document_import_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END; $$;

REVOKE ALL ON FUNCTION public.cleanup_expired_document_import_sessions()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_document_import_sessions() TO service_role;

-- Import all reviewed chapters in one database transaction. This function is
-- idempotent because the locked session can transition to completed only once.
CREATE OR REPLACE FUNCTION public.import_docx_chapters(
  p_session_id uuid,
  p_actor_id uuid,
  p_work_id uuid,
  p_chapters jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.document_import_sessions%ROWTYPE;
  v_work public.works%ROWTYPE;
  v_is_admin boolean := false;
  v_is_approved_author boolean := false;
  v_item jsonb;
  v_existing_max integer;
  v_chapter_id uuid;
  v_count integer := 0;
BEGIN
  SELECT coalesce(is_admin, false) OR role = 'admin'
    INTO v_is_admin FROM public.profiles WHERE id = p_actor_id;
  SELECT EXISTS (
    SELECT 1 FROM public.author_profiles
    WHERE user_id = p_actor_id AND status = 'approved'
  ) INTO v_is_approved_author;
  IF NOT coalesce(v_is_admin, false) AND NOT v_is_approved_author THEN
    RAISE EXCEPTION 'APPROVED_AUTHOR_REQUIRED';
  END IF;

  SELECT * INTO v_work FROM public.works WHERE id = p_work_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;
  IF v_work.author_id <> p_actor_id AND NOT coalesce(v_is_admin, false) THEN
    RAISE EXCEPTION 'WORK_OWNERSHIP_REQUIRED';
  END IF;
  IF v_work.status IN ('published','archived') OR coalesce(v_work.is_archived, false) THEN
    RAISE EXCEPTION 'WORK_NOT_IMPORTABLE';
  END IF;

  SELECT * INTO v_session
    FROM public.document_import_sessions
    WHERE id = p_session_id AND created_by = p_actor_id AND work_id = p_work_id
    FOR UPDATE;
  IF NOT FOUND OR v_session.expires_at <= now() THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_FOUND'; END IF;
  IF v_session.status = 'completed' THEN RAISE EXCEPTION 'IMPORT_ALREADY_COMPLETED'; END IF;
  IF v_session.status <> 'ready' THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_READY'; END IF;
  IF coalesce((v_session.statistics->>'suspiciousLoss')::boolean, true)
     OR coalesce((v_session.statistics->>'textRetention')::numeric, 0) < 0.985 THEN
    RAISE EXCEPTION 'IMPORT_INTEGRITY_FAILED';
  END IF;

  UPDATE public.document_import_sessions
    SET status = 'importing', updated_at = now() WHERE id = p_session_id;
  SELECT coalesce(max(chapter_number), 0) INTO v_existing_max
    FROM public.chapters WHERE work_id = p_work_id AND status <> 'archived';

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_chapters) LOOP
    IF nullif(btrim(v_item->>'title'), '') IS NULL
       OR nullif(btrim(v_item->>'contentHtml'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_CHAPTER';
    END IF;
    INSERT INTO public.chapters(
      work_id, chapter_number, title, slug, is_free, is_preview_free,
      price, status, created_at, updated_at
    ) VALUES (
      p_work_id,
      v_existing_max + v_count + 1,
      left(btrim(v_item->>'title'), 180),
      'bob-' || (v_existing_max + v_count + 1) || '-' || substr(md5(random()::text), 1, 8),
      false, false, 0, 'draft', now(), now()
    ) RETURNING id INTO v_chapter_id;
    INSERT INTO public.chapter_contents(chapter_id, content, updated_at)
      VALUES (v_chapter_id, v_item->>'contentHtml', now());
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'NO_CHAPTERS'; END IF;

  UPDATE public.works
    SET status = CASE WHEN status = 'rejected' THEN 'draft' ELSE status END,
        rejection_reason = CASE WHEN status = 'rejected' THEN NULL ELSE rejection_reason END,
        updated_at = now()
    WHERE id = p_work_id;
  UPDATE public.document_import_sessions
    SET status = 'completed', updated_at = now() WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'imported', v_count,
    'startChapterNumber', v_existing_max + 1,
    'status', 'completed'
  );
END; $$;

REVOKE ALL ON FUNCTION public.import_docx_chapters(uuid,uuid,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_docx_chapters(uuid,uuid,uuid,jsonb) TO service_role;

COMMENT ON TABLE public.document_import_sessions IS
  'Temporary server-side DOCX previews. Source DOCX bytes are not stored.';
