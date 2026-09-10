-- Keep payment and support links on the official Manbora Telegram account.
-- The application reads this value from platform_settings, so updating only
-- the frontend fallback would leave existing installations on the old handle.
INSERT INTO public.platform_settings (key, value)
VALUES ('telegram_support_username', '"manbora_admin"'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();
