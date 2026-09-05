-- Migration 016: Social Follows, Library Collections, and In-site Notifications
-- Forward migration for Manbora platform

-- 1. Work Follows (Kitobxon asarni kuzatishi)
CREATE TABLE IF NOT EXISTS public.work_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_follows_user_work UNIQUE (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_work_follows_user ON public.work_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_work_follows_work ON public.work_follows(work_id);

-- 2. Author Follows (Kitobxon muallifni kuzatishi)
CREATE TABLE IF NOT EXISTS public.author_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.author_profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_author_follows_user_author UNIQUE (user_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_author_follows_user ON public.author_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_author_follows_author ON public.author_follows(author_id);

-- 3. In-Site Notifications (Sayt ichidagi bildirishnomalar)
CREATE TABLE IF NOT EXISTS public.in_site_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_chapter', 'review_response', 'promotion', 'topup_approved', 'payout_processed', 'work_approved', 'system'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link_url TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.in_site_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON public.in_site_notifications(user_id, created_at DESC);

-- Ensure library items has appropriate composite index for collections
CREATE INDEX IF NOT EXISTS idx_library_items_user_state_updated ON public.library_items(user_id, saved_state, updated_at DESC);

-- Enable RLS
ALTER TABLE public.work_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.author_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_site_notifications ENABLE ROW LEVEL SECURITY;

-- Work Follows Policies
DO $$ BEGIN
  CREATE POLICY "Users can view all work follows count" ON public.work_follows
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own work follows" ON public.work_follows
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Author Follows Policies
DO $$ BEGIN
  CREATE POLICY "Users can view all author follows count" ON public.author_follows
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can manage own author follows" ON public.author_follows
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- In-Site Notifications Policies
DO $$ BEGIN
  CREATE POLICY "Users can view own notifications" ON public.in_site_notifications
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON public.in_site_notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service and admin can insert notifications" ON public.in_site_notifications
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
