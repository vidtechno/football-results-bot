'use client';
import { useEffect } from 'react';
import { trackAnalytics } from '@/lib/analytics/client';

export function WorkAnalyticsTracker({ workId, chapterId }: { workId: string; chapterId?: string }) {
  useEffect(() => { trackAnalytics(chapterId ? 'chapter_start' : 'work_view', { workId, chapterId }); }, [workId, chapterId]);
  return null;
}
