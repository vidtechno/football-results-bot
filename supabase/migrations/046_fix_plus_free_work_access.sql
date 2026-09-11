-- Prevent legacy access_type='free' / chapters.is_free values from bypassing
-- Manbora Plus. Plus works expose only chapter 1 (or an explicit preview), unless
-- the reader purchased the work or has an active subscription.
DROP POLICY IF EXISTS "Read chapter content if free, purchased, author, or admin" ON public.chapter_contents;
CREATE POLICY "Read chapter content if free, purchased, author, or admin"
  ON public.chapter_contents FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      WHERE c.id=chapter_contents.chapter_id AND c.status='published' AND w.status='published'
        AND ((w.is_plus=false AND c.is_free=true) OR c.is_preview_free=true OR (w.is_plus=true AND c.chapter_number=1))
    )
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      JOIN public.plus_subscriptions ps ON ps.user_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND w.is_plus=true
        AND c.status='published' AND w.status='published'
        AND ps.status='active' AND ps.starts_at<=now() AND ps.expires_at>now()
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.entitlements e ON e.user_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND (
        (e.entitlement_type='full_work' AND e.work_id=c.work_id) OR
        (e.entitlement_type='chapter' AND e.chapter_id=c.id)
      )
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.purchases p ON p.buyer_id=auth.uid()
      WHERE c.id=chapter_contents.chapter_id AND p.status IN ('active','completed','paid') AND (
        (p.purchase_type='full_work' AND p.work_id=c.work_id) OR
        (p.purchase_type='chapter' AND p.chapter_id=c.id)
      )
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapters c JOIN public.works w ON w.id=c.work_id
      WHERE c.id=chapter_contents.chapter_id AND w.author_id=auth.uid()
    ))
    OR (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true
    ))
  );
