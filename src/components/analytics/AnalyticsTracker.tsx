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

    let lastUserActivity = Date.now();
    let lastPresenceSent = Date.now();

    const onUserActivity = () => {
      lastUserActivity = Date.now();
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });

    // Activity & visibility-aware presence tracking (every 6 minutes)
    const heartbeat = setInterval(() => {
      const isVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
      const wasActiveRecently = Date.now() - lastUserActivity < 360000;
      if (isVisible && wasActiveRecently) {
        lastPresenceSent = Date.now();
        void send('presence');
      }
    }, 360000);

    // Send presence on tab return if inactive for a while
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPresenceSent > 360000) {
        lastPresenceSent = Date.now();
        void send('presence');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timerHandle) clearTimeout(timerHandle);
      clearInterval(heartbeat);
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('scroll', onUserActivity);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pathname]);
  return null;
}
