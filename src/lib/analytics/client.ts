'use client';

export type AnalyticsEvent = 'page_view' | 'work_view' | 'chapter_start' | 'chapter_complete' | 'signup_gate' | 'presence';

function getSessionId() {
  let id = sessionStorage.getItem('manbora_analytics_session');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('manbora_analytics_session', id);
  }
  return id;
}

export function trackAnalytics(eventType: AnalyticsEvent, extra: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  return fetch('/api/analytics/track', {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
    body: JSON.stringify({ sessionId: getSessionId(), eventType, path: location.pathname,
      referrerHost: document.referrer ? new URL(document.referrer).hostname : null,
      deviceType: innerWidth < 640 ? 'mobile' : innerWidth < 1024 ? 'tablet' : 'desktop', ...extra }),
  }).catch(() => undefined);
}
