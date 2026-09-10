-- Enforce the public follow rules at the database boundary as well as in the API.
-- Existing rows are preserved; the trigger protects all future inserts/updates,
-- including direct PostgREST calls that do not pass through the Next.js route.
CREATE OR REPLACE FUNCTION public.validate_author_follow_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = NEW.author_id THEN
    RAISE EXCEPTION 'Foydalanuvchi ozini ozi kuzata olmaydi';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.author_profiles ap
    WHERE ap.user_id = NEW.author_id
      AND ap.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Faqat tasdiqlangan mualliflarni kuzatish mumkin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_author_follow_target ON public.author_follows;
CREATE TRIGGER trg_validate_author_follow_target
BEFORE INSERT OR UPDATE OF user_id, author_id ON public.author_follows
FOR EACH ROW
EXECUTE FUNCTION public.validate_author_follow_target();

REVOKE ALL ON FUNCTION public.validate_author_follow_target() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_author_follow_target() TO service_role;
