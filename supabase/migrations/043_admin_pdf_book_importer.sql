-- Forward-only admin PDF import sessions and atomic draft chapter import.
CREATE TABLE IF NOT EXISTS public.pdf_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  original_filename text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','extracting','analyzing','needs_review','ready','importing','completed','failed')),
  raw_text text NOT NULL DEFAULT '',
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  unassigned_text text NOT NULL DEFAULT '',
  ignored_metadata jsonb NOT NULL DEFAULT '[]'::jsonb,
  statistics jsonb NOT NULL DEFAULT '{}'::jsonb,
  warning text,
  error_message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_import_sessions_owner_expiry
  ON public.pdf_import_sessions(created_by, expires_at DESC);
ALTER TABLE public.pdf_import_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pdf_import_sessions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_import_pdf_chapters(
  p_session_id uuid,
  p_admin_id uuid,
  p_work_id uuid,
  p_chapters jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.pdf_import_sessions%ROWTYPE;
  v_item jsonb;
  v_existing_max integer;
  v_chapter_id uuid;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_session FROM public.pdf_import_sessions
    WHERE id = p_session_id AND created_by = p_admin_id FOR UPDATE;
  IF NOT FOUND OR v_session.expires_at <= now() THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_FOUND'; END IF;
  IF v_session.status NOT IN ('needs_review','ready') THEN RAISE EXCEPTION 'IMPORT_SESSION_NOT_READY'; END IF;
  IF coalesce((v_session.statistics->>'coverage')::numeric, 0) < 1
     OR length(v_session.unassigned_text) > 0 THEN RAISE EXCEPTION 'IMPORT_INTEGRITY_FAILED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.works WHERE id = p_work_id) THEN RAISE EXCEPTION 'WORK_NOT_FOUND'; END IF;

  UPDATE public.pdf_import_sessions SET status = 'importing', updated_at = now() WHERE id = p_session_id;
  SELECT coalesce(max(chapter_number), 0) INTO v_existing_max FROM public.chapters WHERE work_id = p_work_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_chapters) LOOP
    IF nullif(trim(v_item->>'title'), '') IS NULL OR nullif(trim(v_item->>'content'), '') IS NULL THEN
      RAISE EXCEPTION 'INVALID_CHAPTER';
    END IF;
    INSERT INTO public.chapters(work_id, chapter_number, title, slug, is_free, is_preview_free, price, status, created_at, updated_at)
    VALUES (p_work_id, v_existing_max + v_count + 1, trim(v_item->>'title'),
      trim(both '-' from regexp_replace(lower(trim(v_item->>'title')), '[^a-z0-9]+', '-', 'g')) || '-' || (v_existing_max + v_count + 1),
      false, false, 0, 'draft', now(), now()) RETURNING id INTO v_chapter_id;
    INSERT INTO public.chapter_contents(chapter_id, content, updated_at)
      VALUES (v_chapter_id, v_item->>'content', now());
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'NO_CHAPTERS'; END IF;
  UPDATE public.pdf_import_sessions SET status = 'completed', work_id = p_work_id, updated_at = now() WHERE id = p_session_id;
  RETURN jsonb_build_object('imported', v_count, 'startChapterNumber', v_existing_max + 1);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END; $$;

REVOKE ALL ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_pdf_chapters(uuid,uuid,uuid,jsonb) TO service_role;

-- Schedule externally (Supabase Cron) if desired: delete expired rows once daily.
CREATE OR REPLACE FUNCTION public.cleanup_expired_pdf_import_sessions() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.pdf_import_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_pdf_import_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pdf_import_sessions() TO service_role;
