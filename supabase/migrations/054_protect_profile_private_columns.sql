-- 054: Shaxsiy ustunlarni (email, telegram, sozlamalar) ommaga yopish.
--
-- Muammo: anon va authenticated rollari profiles jadvalining BARCHA ustunlarini, jumladan
-- email, telegram_username, notification_preferences va reading_preferences'ni o'qiy olardi
-- (RLS "Public profiles are readable by everyone" — USING true). Public anon kalit bilan
-- hamma foydalanuvchining emailini yuklab olish mumkin edi.
--
-- DIQQAT: bu migratsiyani kod deploy qilingandan KEYIN qo'llang. Kod endi profiles'dan
-- faqat ochiq ustunlarni so'raydi; shaxsiy maydonlar server (service_role) orqali beriladi
-- (/api/auth/profile, /api/user/profile).

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, public_id, display_name, username, avatar_url, bio, is_admin,
  onboarding_completed, social_links, created_at, updated_at
) ON public.profiles TO anon, authenticated;
