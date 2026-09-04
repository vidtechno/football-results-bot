-- ============================================================================
-- 012_platform_enhancements.sql
-- MANBORA PLATFORM ENHANCEMENTS: SECURE UPLOADS, REVISIONS, ARCHIVE & PERFORMANCE INDEXES
-- ============================================================================

-- 1. ADD ARCHIVE & REVISION FIELDS TO WORKS
ALTER TABLE public.works 
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_revision JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_works_is_archived ON public.works(is_archived);
CREATE INDEX IF NOT EXISTS idx_works_author_archived ON public.works(author_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_works_author_status ON public.works(author_id, status);

-- 2. ADD CHAPTER REORDER & PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_chapters_work_slug ON public.chapters(work_id, slug);
CREATE INDEX IF NOT EXISTS idx_chapters_work_num_published ON public.chapters(work_id, chapter_number) WHERE status = 'published';

-- 3. PROFILES READING PREFERENCES & SEARCH INDEXES
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reading_preferences JSONB DEFAULT '{"theme":"light","fontFamily":"serif","fontSize":18,"lineHeight":"relaxed","contentWidth":"medium"}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lookup ON public.profiles(username);

-- 4. STORAGE BUCKET: QUARANTINE UPLOADS (Private staging for sharp verification)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quarantine-uploads', 'quarantine-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage Policies for quarantine-uploads
DROP POLICY IF EXISTS "Authenticated users can upload to quarantine" ON storage.objects;
CREATE POLICY "Authenticated users can upload to quarantine"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quarantine-uploads' 
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can read own quarantine files" ON storage.objects;
CREATE POLICY "Users can read own quarantine files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quarantine-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own quarantine files" ON storage.objects;
CREATE POLICY "Users can delete own quarantine files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'quarantine-uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
