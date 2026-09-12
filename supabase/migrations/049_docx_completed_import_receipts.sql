-- Keep a minimal completed receipt so cleanup cannot enable duplicate imports.
-- Source/preview text still expires after 24 hours.
CREATE OR REPLACE FUNCTION public.cleanup_expired_document_import_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted integer;
BEGIN
  UPDATE public.document_import_sessions
    SET raw_text = '', expected_body_text = '', chapters = '[]'::jsonb,
        suggestions = '[]'::jsonb, warnings = '[]'::jsonb
    WHERE expires_at < now() AND status = 'completed'
      AND (raw_text <> '' OR chapters <> '[]'::jsonb);
  DELETE FROM public.document_import_sessions
    WHERE expires_at < now() AND status <> 'completed';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END; $$;
REVOKE ALL ON FUNCTION public.cleanup_expired_document_import_sessions()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_document_import_sessions() TO service_role;
