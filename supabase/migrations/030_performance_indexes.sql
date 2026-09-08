-- ============================================================================
-- 030_performance_indexes.sql
-- MANBORA PLATFORM: HIGH-VALUE PERFORMANCE INDEXES FOR STATS & READER LOOKUPS
-- ============================================================================

-- 1. Index on reading_progress(work_id) for public readers/completion count queries
CREATE INDEX IF NOT EXISTS idx_reading_progress_work_id
ON public.reading_progress(work_id);

-- 2. Index on reading_bookmarks(work_id) for public bookmark count queries
CREATE INDEX IF NOT EXISTS idx_reading_bookmarks_work_id
ON public.reading_bookmarks(work_id);
