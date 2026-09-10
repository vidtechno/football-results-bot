-- Stop streak/XP gamification while preserving reading progress and completion analytics.
-- Historical activity tables are intentionally retained to avoid destructive data loss.
CREATE OR REPLACE FUNCTION public.record_reading_activity(
  p_user_id UUID,
  p_work_id UUID,
  p_chapter_id UUID,
  p_percentage INTEGER,
  p_active_seconds INTEGER DEFAULT 0,
  p_page_advanced BOOLEAN DEFAULT FALSE,
  p_book_completed BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percent INTEGER := LEAST(100, GREATEST(0, COALESCE(p_percentage, 0)));
  v_chapter_done INTEGER := 0;
  v_book_done INTEGER := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Ruxsat yoq';
  END IF;

  IF v_percent >= 100 THEN
    INSERT INTO public.chapter_read_milestones(user_id, work_id, chapter_id, milestone)
    VALUES (p_user_id, p_work_id, p_chapter_id, 100)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_chapter_done = ROW_COUNT;
  END IF;

  INSERT INTO public.chapter_read_milestones(user_id, work_id, chapter_id, milestone)
  SELECT p_user_id, p_work_id, p_chapter_id, milestone
  FROM unnest(ARRAY[25, 50, 75]::SMALLINT[]) AS milestone
  WHERE v_percent >= milestone
  ON CONFLICT DO NOTHING;

  IF p_book_completed AND v_percent >= 100 THEN
    INSERT INTO public.work_read_completions(user_id, work_id)
    VALUES (p_user_id, p_work_id)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_book_done = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'chapterCompleted', v_chapter_done = 1,
    'bookCompleted', v_book_done = 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_reading_activity(UUID,UUID,UUID,INTEGER,INTEGER,BOOLEAN,BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_reading_activity(UUID,UUID,UUID,INTEGER,INTEGER,BOOLEAN,BOOLEAN) TO service_role;
