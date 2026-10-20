-- 052: Manbora Plus faqat admin kiritgan asarlar uchun.
-- Muallif yozgan asar hech qachon Plus bo'la olmaydi (INSERT, UPDATE, muallif almashishi, admin huquqi olinishi).

-- 1. Qoida: is_plus = true bo'lsa, asar muallifi admin bo'lishi shart (service_role uchun ham).
CREATE OR REPLACE FUNCTION public.enforce_work_plus_admin_only() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT COALESCE(NEW.is_plus, false) THEN
    RETURN NEW;
  END IF;

  -- Plus holatini faqat admin (yoki server) o'zgartira oladi
  IF TG_OP = 'INSERT' OR NEW.is_plus IS DISTINCT FROM OLD.is_plus THEN
    IF auth.role() <> 'service_role' AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'ADMIN_REQUIRED_FOR_PLUS';
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = NEW.author_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'ONLY_ADMIN_WORKS_CAN_BE_PLUS';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_enforce_work_plus_admin_only ON public.works;
CREATE TRIGGER trg_enforce_work_plus_admin_only
  BEFORE INSERT OR UPDATE OF is_plus, author_id ON public.works
  FOR EACH ROW EXECUTE FUNCTION public.enforce_work_plus_admin_only();

-- 2. Admin huquqi olib tashlansa, uning asarlari Plus katalogidan chiqariladi.
CREATE OR REPLACE FUNCTION public.clear_plus_when_admin_removed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_admin = true AND NEW.is_admin IS DISTINCT FROM true THEN
    UPDATE public.works SET is_plus = false, updated_at = now()
    WHERE author_id = NEW.id AND is_plus = true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_clear_plus_when_admin_removed ON public.profiles;
CREATE TRIGGER trg_clear_plus_when_admin_removed
  AFTER UPDATE OF is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.clear_plus_when_admin_removed();

-- Trigger funksiyalarini API (RPC) orqali chaqirib bo'lmasin
REVOKE ALL ON FUNCTION public.enforce_work_plus_admin_only() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_plus_when_admin_removed() FROM PUBLIC, anon, authenticated;

-- 3. Plus narxi: yagona manba — platform_settings.plus_monthly_price (kod zaxirasi ham 19000)
INSERT INTO public.platform_settings(key, value, updated_at)
VALUES ('plus_monthly_price', '19000', now())
ON CONFLICT (key) DO NOTHING;
