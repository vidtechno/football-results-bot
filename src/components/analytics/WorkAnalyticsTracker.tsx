'use client';
import { useEffect } from 'react';
import { trackAnalytics } from '@/lib/analytics/client';

export function WorkAnalyticsTracker({ workId, chapterId }: { workId: string; chapterId?: string }) {
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const eventType = chapterId ? 'chapter_start' : 'work_view';
      const dedupeKey = `manbora_analytics:${eventType}:${chapterId || workId}`;
      if (sessionStorage.getItem(dedupeKey)) return;
      sessionStorage.setItem(dedupeKey, '1');
      void trackAnalytics(eventType, { workId, chapterId })?.then(() => {
        if (!chapterId && !cancelled) {
          window.dispatchEvent(new CustomEvent('manbora:work-view-recorded', { detail: { workId } }));
        }
      });
    };

    let idleHandle: any;
    let timerHandle: any;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as any).requestIdleCallback(run, { timeout: 1500 });
    } else {
      timerHandle = setTimeout(run, 300);
    }

    return () => {
      cancelled = true;
      if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timerHandle) clearTimeout(timerHandle);
    };
  }, [workId, chapterId]);
  return null;
}
