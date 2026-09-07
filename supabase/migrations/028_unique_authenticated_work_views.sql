-- One work view per registered account. Guest sessions are intentionally excluded.
CREATE TABLE IF NOT EXISTS public.work_views (
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (work_id, user_id)
);

INSERT INTO public.work_views (work_id, user_id, viewed_at)
SELECT work_id, user_id, MIN(created_at)
FROM public.analytics_events
WHERE event_type = 'work_view' AND work_id IS NOT NULL AND user_id IS NOT NULL
GROUP BY work_id, user_id
ON CONFLICT (work_id, user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_work_views_viewed_at ON public.work_views(viewed_at DESC);
ALTER TABLE public.work_views ENABLE ROW LEVEL SECURITY;
-- No client policies: the validated server endpoint records views.
