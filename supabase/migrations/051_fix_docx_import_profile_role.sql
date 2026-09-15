-- Older production profiles have is_admin but no role column.
-- Preserve the atomic import transaction and all ownership/integrity checks.
DO $$
DECLARE
  v_definition text;
BEGIN
  IF to_regprocedure('public.import_docx_chapters(uuid,uuid,uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Run migration 048_docx_import_and_safe_work_deletion.sql first';
  END IF;
  SELECT pg_get_functiondef('public.import_docx_chapters(uuid,uuid,uuid,jsonb)'::regprocedure)
    INTO v_definition;
  v_definition := regexp_replace(
    v_definition,
    'OR\s+role\s*=\s*''admin''',
    'OR coalesce(to_jsonb(profiles)->>''role'', '''') = ''admin''',
    'gi'
  );
  EXECUTE v_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.import_docx_chapters(uuid,uuid,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_docx_chapters(uuid,uuid,uuid,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
