'use client';
import { useEffect } from 'react';
import { trackAnalytics } from '@/lib/analytics/client';

export function WorkAnalyticsTracker({ workId, chapterId }: { workId: string; chapterId?: string }) {
  useEffect(() => {
    void trackAnalytics(chapterId ? 'chapter_start' : 'work_view', { workId, chapterId })?.then(() => {
      if (!chapterId) window.dispatchEvent(new CustomEvent('manbora:work-view-recorded', { detail: { workId } }));
    });
  }, [workId, chapterId]);
  return null;
}
