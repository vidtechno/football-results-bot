-- Align existing public author names with the editable account profile.
UPDATE public.author_profiles ap
SET pen_name = p.display_name,
    updated_at = timezone('utc'::text, now())
FROM public.profiles p
WHERE p.id = ap.user_id
  AND NULLIF(BTRIM(p.display_name), '') IS NOT NULL
  AND ap.pen_name IS DISTINCT FROM p.display_name;

-- Keep names aligned even when profiles are changed through another trusted path.
CREATE OR REPLACE FUNCTION public.sync_author_public_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     AND NULLIF(BTRIM(NEW.display_name), '') IS NOT NULL THEN
    UPDATE public.author_profiles
    SET pen_name = NEW.display_name,
        updated_at = timezone('utc'::text, now())
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_author_public_name ON public.profiles;
CREATE TRIGGER trg_sync_author_public_name
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_author_public_name();

-- Apply the dedicated free-preview flag when a published chapter edit is approved.
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

  UPDATE public.chapters
  SET title = v_rev.title,
      is_free = v_rev.is_free,
      is_preview_free = v_rev.is_preview_free,
      price = v_rev.price,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_rev.chapter_id;

  INSERT INTO public.chapter_contents (chapter_id, content, updated_at)
  VALUES (v_rev.chapter_id, v_rev.content, timezone('utc'::text, now()))
  ON CONFLICT (chapter_id) DO UPDATE
  SET content = EXCLUDED.content,
      updated_at = EXCLUDED.updated_at;

  UPDATE public.chapter_revisions
  SET status = 'approved',
      moderator_id = COALESCE(v_caller_id, moderator_id),
      reviewed_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_revision_id;

  RETURN jsonb_build_object(
    'success', true,
    'chapter_id', v_rev.chapter_id,
    'revision_id', p_revision_id
  );
END;
$$;
