-- ============================================================================
-- Migration 022: Notifications Read Timestamp & Payout Requests Admin Sync
-- ============================================================================
-- Description:
-- 1. Adds read_at TIMESTAMPTZ to public.in_site_notifications and backfills existing rows.
-- 2. Creates composite index for high-performance unread count queries.
-- 3. Ensures explicit Admin RLS access on public.payout_requests.
--
-- Safety:
-- Forward-only, idempotent, non-destructive. Uses to_regclass and IF NOT EXISTS.
-- Preserves all existing records, notifications, transactions, and audit logs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. In-Site Notifications: read_at column and optimized unread index
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.in_site_notifications') IS NOT NULL THEN
    -- Add read_at column if not exists
    ALTER TABLE public.in_site_notifications
      ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

    -- Backfill read_at for rows already marked read where read_at is null
    UPDATE public.in_site_notifications
    SET read_at = created_at
    WHERE is_read = true AND read_at IS NULL;

    -- Index for rapid unread queries: WHERE is_read = false OR read_at IS NULL
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'in_site_notifications'
        AND indexname = 'idx_in_site_notifications_user_unread_opt'
    ) THEN
      CREATE INDEX idx_in_site_notifications_user_unread_opt
        ON public.in_site_notifications (user_id, is_read, read_at, created_at DESC);
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Payout Requests: Admin RLS access policy
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.payout_requests') IS NOT NULL THEN
    -- Ensure RLS is enabled
    ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

    -- Drop legacy policy if it exists and replace with comprehensive admin policy
    DROP POLICY IF EXISTS "Admins have full access to payout requests" ON public.payout_requests;
    CREATE POLICY "Admins have full access to payout requests"
      ON public.payout_requests
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND is_admin = true
        )
      );

    -- Ensure authors can select and insert their own requests
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'payout_requests'
        AND policyname = 'Authors can view own payout requests'
    ) THEN
      CREATE POLICY "Authors can view own payout requests"
        ON public.payout_requests
        FOR SELECT
        TO authenticated
        USING (auth.uid() = author_id);
    END IF;
  END IF;
END $$;
