'use client';

export type EventType = 'search_select' | 'profile_open' | 'card_click';

const VISITOR_KEY = 'manbora_anon_vid';

/**
 * Get or create anonymous visitor ID stored in localStorage
 */
export function getAnonymousVisitorId(): string {
  if (typeof window === 'undefined') return '';

  try {
    let vid = localStorage.getItem(VISITOR_KEY);
    if (!vid) {
      vid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`;
      localStorage.setItem(VISITOR_KEY, vid);
    }
    return vid;
  } catch {
    return `anon_fallback_${Date.now()}`;
  }
}

/**
 * Send an anonymous public engagement event to the backend (non-blocking)
 */
export async function trackEvent(organizationId: number, eventType: EventType): Promise<boolean> {
  if (typeof window === 'undefined' || !organizationId) return false;

  const visitorId = getAnonymousVisitorId();
  if (!visitorId) return false;

  try {
    const payload = {
      organization_id: organizationId,
      event_type: eventType,
      visitor_id: visitorId,
    };

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
      return true;
    }

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}
