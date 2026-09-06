-- ============================================================================
-- Migration 023: Reader Engagement & Author Studio V2
-- ============================================================================
-- Description:
-- 1. User Genre Preferences & Profile Onboarding
-- 2. Chapter Comments & One-Level Threaded Replies
-- 3. Chapter Reactions (next_chapter, like, surprised, sad)
-- 4. Chapter Scheduling (scheduled_at, status check update)
-- 5. Chapter Version History & Snapshots
-- 6. Author Public Posts
-- 7. Works Extensions for Curated Collections (is_featured, total_words)
-- 8. User Reports target_type expansion for comments
--
-- Safety:
-- Forward-only, idempotent, non-destructive. Uses to_regclass, IF NOT EXISTS.
-- Preserves 100% of all existing records, purchases, balances, and reading progress.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER GENRE PREFERENCES & PROFILE ONBOARDING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_genre_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_user_genre_preferences_user ON public.user_genre_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_genre_preferences_genre ON public.user_genre_preferences(genre_id);

ALTER TABLE public.user_genre_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own genre preferences" ON public.user_genre_preferences;
  CREATE POLICY "Users can view own genre preferences" ON public.user_genre_preferences
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own genre preferences" ON public.user_genre_preferences;
  CREATE POLICY "Users can insert own genre preferences" ON public.user_genre_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own genre preferences" ON public.user_genre_preferences;
  CREATE POLICY "Users can delete own genre preferences" ON public.user_genre_preferences
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add onboarding_completed column to profiles if not exists
DO $$ BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CHAPTER COMMENTS & THREADED REPLIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.chapter_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_spoiler BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_chapter_date
  ON public.chapter_comments(chapter_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_work
  ON public.chapter_comments(work_id);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_parent
  ON public.chapter_comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_chapter_comments_user
  ON public.chapter_comments(user_id);

ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view comments" ON public.chapter_comments;
  CREATE POLICY "Anyone can view comments" ON public.chapter_comments
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.chapter_comments;
  CREATE POLICY "Authenticated users can insert comments" ON public.chapter_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own comments" ON public.chapter_comments;
  CREATE POLICY "Users can update own comments" ON public.chapter_comments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own comments" ON public.chapter_comments;
  CREATE POLICY "Users can delete own comments" ON public.chapter_comments
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3. CHAPTER REACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('next_chapter', 'like', 'surprised', 'sad')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chapter_reactions_user_chapter UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_reactions_chapter
  ON public.chapter_reactions(chapter_id, reaction_type);

CREATE INDEX IF NOT EXISTS idx_chapter_reactions_work
  ON public.chapter_reactions(work_id);

ALTER TABLE public.chapter_reactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view reactions" ON public.chapter_reactions;
  CREATE POLICY "Anyone can view reactions" ON public.chapter_reactions
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own reactions" ON public.chapter_reactions;
  CREATE POLICY "Users can manage own reactions" ON public.chapter_reactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 4. CHAPTER SCHEDULING EXTENSIONS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.chapters') IS NOT NULL THEN
    ALTER TABLE public.chapters
      ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

    -- Update or drop old check constraint on status if necessary to permit 'scheduled' and 'archived'
    ALTER TABLE public.chapters DROP CONSTRAINT IF EXISTS chapters_status_check;
    ALTER TABLE public.chapters ADD CONSTRAINT chapters_status_check
      CHECK (status IN ('draft', 'scheduled', 'published', 'archived'));

    CREATE INDEX IF NOT EXISTS idx_chapters_scheduled_publish
      ON public.chapters(status, scheduled_at)
      WHERE status = 'scheduled';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. CHAPTER VERSION HISTORY & SNAPSHOTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapter_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  word_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_created
  ON public.chapter_versions(chapter_id, created_at DESC);

ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authors can view and manage own chapter versions" ON public.chapter_versions;
  CREATE POLICY "Authors can view and manage own chapter versions" ON public.chapter_versions
    FOR ALL USING (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
    WITH CHECK (
      auth.uid() = author_id
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 6. AUTHOR PUBLIC POSTS & UPDATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.author_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.author_profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  likes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_author_posts_author_date
  ON public.author_posts(author_id, created_at DESC)
  WHERE is_published = true;

ALTER TABLE public.author_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Anyone can view published author posts" ON public.author_posts;
  CREATE POLICY "Anyone can view published author posts" ON public.author_posts
    FOR SELECT USING (is_published = true OR auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authors can manage own posts" ON public.author_posts;
  CREATE POLICY "Authors can manage own posts" ON public.author_posts
    FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 7. WORKS EXTENSIONS FOR COLLECTIONS & SEARCH
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.works') IS NOT NULL THEN
    ALTER TABLE public.works
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS total_words INT NOT NULL DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_works_featured_published
      ON public.works(is_featured, published_at DESC)
      WHERE status = 'published';

    CREATE INDEX IF NOT EXISTS idx_works_total_words
      ON public.works(total_words);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 8. USER REPORTS: SUPPORT CHAPTER COMMENT TARGET TYPE
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.user_reports') IS NOT NULL THEN
    ALTER TABLE public.user_reports DROP CONSTRAINT IF EXISTS user_reports_target_type_check;
    ALTER TABLE public.user_reports ADD CONSTRAINT user_reports_target_type_check
      CHECK (target_type IN ('work', 'chapter', 'review', 'author', 'chapter_comment'));
  END IF;
END $$;
