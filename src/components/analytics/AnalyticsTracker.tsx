'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let sessionId = sessionStorage.getItem('manbora_analytics_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('manbora_analytics_session', sessionId);
    }
    const key = `manbora_viewed:${pathname}`;
    const send = (eventType: string) => fetch('/api/analytics/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ sessionId, eventType, path: pathname, referrerHost: document.referrer ? new URL(document.referrer).hostname : null, deviceType: innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop' }),
    }).catch(() => {});
    const scheduleTracking = () => {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        void send('page_view');
      }
    };

    let idleHandle: any;
    let timerHandle: any;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = (window as any).requestIdleCallback(scheduleTracking, { timeout: 1500 });
    } else {
      timerHandle = setTimeout(scheduleTracking, 300);
    }

    return () => {
      if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timerHandle) clearTimeout(timerHandle);
    };
  }, [pathname]);
  return null;
}
