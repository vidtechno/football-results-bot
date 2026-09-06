-- 026_admin_curated_translated_works.sql
-- Admin-curated Uzbek translations. The internal uploader remains private;
-- public attribution comes from the original-author/translator metadata.

ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS is_translation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_title TEXT,
  ADD COLUMN IF NOT EXISTS original_author_name TEXT,
  ADD COLUMN IF NOT EXISTS source_language TEXT,
  ADD COLUMN IF NOT EXISTS translator_name TEXT,
  ADD COLUMN IF NOT EXISTS translation_rights_basis TEXT;

CREATE TABLE IF NOT EXISTS public.translation_rights_evidence (
  work_id UUID PRIMARY KEY REFERENCES public.works(id) ON DELETE CASCADE,
  rights_reference TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.translation_rights_evidence ENABLE ROW LEVEL SECURITY;
-- No client policies by design. This table is available only to server-side service-role code.

DO $$ BEGIN
  ALTER TABLE public.works
    ADD CONSTRAINT works_translation_metadata_check CHECK (
      is_translation = false OR (
        NULLIF(btrim(original_author_name), '') IS NOT NULL AND
        NULLIF(btrim(source_language), '') IS NOT NULL AND
        translation_rights_basis IN ('public_domain', 'licensed')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_works_published_translations
  ON public.works (is_translation, published_at DESC)
  WHERE status = 'published' AND is_archived = false;

COMMENT ON COLUMN public.works.author_id IS
  'Internal owner/uploader. For translated works this value must never be used as public authorship attribution.';
COMMENT ON COLUMN public.works.original_author_name IS
  'Public original author attribution for an admin-curated translated work.';
COMMENT ON TABLE public.translation_rights_evidence IS
  'Private translation rights evidence. Never expose through public DTOs or UI.';
