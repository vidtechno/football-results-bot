-- ============================================================================
-- Migration 021: Fix Typo in "Bekatdagi soat" Chapter 1
-- ============================================================================
-- Description:
-- Idempotently replaces the typo "qotib qolgan edi.an" with "qotib qolgan edi."
-- in the chapter text of "Bekatdagi soat" (Chapter 1: "Kechikkan avtobus").
--
-- Safety:
-- Forward-only, idempotent, non-destructive. Uses safe to_regclass checks
-- and column inspection so it can run cleanly on any schema state.
-- ============================================================================

DO $$
DECLARE
  v_updated_contents INT := 0;
  v_updated_chapters INT := 0;
  v_updated_revisions INT := 0;
  v_col_exists BOOLEAN := false;
BEGIN
  -- 1. Fix in public.chapter_contents (primary storage for chapter body text)
  IF to_regclass('public.chapter_contents') IS NOT NULL AND to_regclass('public.chapters') IS NOT NULL THEN
    UPDATE public.chapter_contents
    SET content = replace(content, 'qotib qolgan edi.an', 'qotib qolgan edi.'),
        updated_at = timezone('utc'::text, now())
    WHERE content LIKE '%qotib qolgan edi.an%'
      AND (
        chapter_id IN (
          SELECT c.id
          FROM public.chapters c
          JOIN public.works w ON c.work_id = w.id
          WHERE (w.slug = 'bekatdagi-soat' OR w.id = 'c1b24b65-34d5-4612-ba9c-ec2f0fb61850')
            AND c.chapter_number = 1
        )
        OR chapter_id IN (
          SELECT c.id
          FROM public.chapters c
          WHERE c.title ILIKE '%Kechikkan avtobus%'
        )
      );

    GET DIAGNOSTICS v_updated_contents = ROW_COUNT;
    RAISE NOTICE 'chapter_contents updated: % rows', v_updated_contents;
  END IF;

  -- 2. Check if public.chapters has a 'content' column directly
  IF to_regclass('public.chapters') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chapters'
        AND column_name = 'content'
    ) INTO v_col_exists;

    IF v_col_exists THEN
      EXECUTE '
        UPDATE public.chapters
        SET content = replace(content, ''qotib qolgan edi.an'', ''qotib qolgan edi.''),
            updated_at = timezone(''utc''::text, now())
        WHERE content LIKE ''%qotib qolgan edi.an%''
          AND (
            (work_id IN (SELECT id FROM public.works WHERE slug = ''bekatdagi-soat'' OR id = ''c1b24b65-34d5-4612-ba9c-ec2f0fb61850'') AND chapter_number = 1)
            OR title ILIKE ''%Kechikkan avtobus%''
          )';
      GET DIAGNOSTICS v_updated_chapters = ROW_COUNT;
      RAISE NOTICE 'chapters.content updated: % rows', v_updated_chapters;
    END IF;
  END IF;

  -- 3. Check if public.chapter_revisions exists and has a 'content' column
  IF to_regclass('public.chapter_revisions') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'chapter_revisions'
        AND column_name = 'content'
    ) INTO v_col_exists;

    IF v_col_exists THEN
      EXECUTE '
        UPDATE public.chapter_revisions
        SET content = replace(content, ''qotib qolgan edi.an'', ''qotib qolgan edi.''),
            updated_at = timezone(''utc''::text, now())
        WHERE content LIKE ''%qotib qolgan edi.an%''';
      GET DIAGNOSTICS v_updated_revisions = ROW_COUNT;
      RAISE NOTICE 'chapter_revisions.content updated: % rows', v_updated_revisions;
    END IF;
  END IF;

  RAISE NOTICE 'Migration 021 finished successfully. Total typos corrected: contents=%, chapters=%, revisions=%',
    v_updated_contents, v_updated_chapters, v_updated_revisions;
END $$;
