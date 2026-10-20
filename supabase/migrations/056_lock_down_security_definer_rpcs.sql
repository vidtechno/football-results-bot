-- 056: SECURITY DEFINER funksiyalarni brauzer rollari (anon, authenticated) uchun yopish.
--
-- Topilma: approve_work_revision / approve_chapter_revision anon rolga ochiq edi, ichidagi admin
-- tekshiruvi esa faqat auth.uid() NULL bo'lmaganda ishlardi. Natijada anonim chaqiruvchi
-- (ochiq anon kalit bilan) kutilayotgan tahrirni tasdiqlay olardi.
--
-- Ilova bu funksiyalarni faqat server (service_role) orqali chaqiradi, shuning uchun
-- EXECUTE huquqini faqat service_role'da qoldiramiz.
-- Trigger funksiyalari uchun EXECUTE shart emas (huquq trigger yaratilganda tekshiriladi).

REVOKE ALL ON FUNCTION public.approve_work_revision(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_chapter_revision(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_work_revision(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_chapter_revision(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet_balance(uuid, text, bigint, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_approve_payout_paid(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_approve_topup(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_reject_payout(uuid, text, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.author_create_payout_request(bigint, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purchase_content(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reorder_chapters(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_work_public_stats(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet_balance(uuid, text, bigint, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_payout_paid(uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_topup(uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_payout(uuid, text, boolean, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.author_create_payout_request(bigint, text, text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purchase_content(uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reorder_chapters(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_work_public_stats(uuid) TO service_role;

-- Trigger funksiyalari
REVOKE ALL ON FUNCTION public.enforce_chapter_free_under_free_work() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_self_work_follow() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profiles_admin_field() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_work_reader_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_work_sales_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_author_public_name() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_work_chapters_free_access() FROM PUBLIC, anon, authenticated;

-- Qolgan ogohlantirish: search_path belgilanmagan funksiyalar
ALTER FUNCTION public.generate_manbora_id() SET search_path = public;
ALTER FUNCTION public.prevent_wallet_transactions_mutation() SET search_path = public;
