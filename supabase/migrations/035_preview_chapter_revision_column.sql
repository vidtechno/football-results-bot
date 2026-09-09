-- Keep published-chapter revisions aligned with the canonical free-preview field.
ALTER TABLE public.chapter_revisions
  ADD COLUMN IF NOT EXISTS is_preview_free BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing revisions made before the dedicated preview field retain their intent.
UPDATE public.chapter_revisions cr
SET is_preview_free = TRUE
WHERE cr.is_free = TRUE
  AND EXISTS (
    SELECT 1 FROM public.works w
    WHERE w.id = cr.work_id AND w.access_type = 'paid_full_work'
  );
