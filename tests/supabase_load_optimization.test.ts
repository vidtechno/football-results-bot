import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Supabase load optimization', () => {
  it('removes the public online counter and its polling endpoint', () => {
    expect(fs.existsSync(path.join(root, 'src/components/analytics/OnlineUsersBadge.tsx'))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(root, 'src/app/api/analytics/online/route.ts'))).toBe(false);
    expect(read('src/app/api/admin/analytics/route.ts')).not.toContain(
      "from('analytics_presence')",
    );
  });

  it('uses Realtime as primary notifications transport with a slow hidden-tab-safe fallback', () => {
    const provider = read('src/components/providers/NotificationProvider.tsx');
    expect(provider).toContain("status === 'SUBSCRIBED'");
    expect(provider).toContain('5 * 60 * 1000');
    expect(provider).toContain("document.visibilityState === 'visible'");
    expect(provider).not.toContain('setInterval(fetchNotifications, 45000)');
  });

  it('applies Realtime notification payloads locally instead of refetching the list', () => {
    const provider = read('src/components/providers/NotificationProvider.tsx');
    expect(provider).toContain("payload.eventType === 'INSERT'");
    expect(provider).toContain("payload.eventType === 'UPDATE'");
    expect(provider).toContain("payload.eventType === 'DELETE'");
  });

  it('deduplicates work and chapter analytics within a browser session', () => {
    const tracker = read('src/components/analytics/WorkAnalyticsTracker.tsx');
    expect(tracker).toContain('sessionStorage.getItem(dedupeKey)');
    expect(tracker).toContain("sessionStorage.setItem(dedupeKey, '1')");
  });

  it('does not perform an auth lookup for anonymous session-based analytics', () => {
    const route = read('src/app/api/analytics/track/route.ts');
    expect(route).toContain("body.eventType === 'work_view'");
  });

  it('deduplicates simultaneous final progress lifecycle writes', () => {
    const reader = read('src/components/reader/ReaderView.tsx');
    expect(reader).toContain('lastForcedSaveRef');
    expect(reader).toContain('now - lastForcedSaveRef.current.at < 2000');
  });

  it('keeps public navigation out of the middleware auth waterfall', () => {
    const middleware = read('src/middleware.ts');
    const publicBranch = middleware.slice(
      middleware.indexOf('if (!isProtectedPath)'),
      middleware.indexOf('// Validates user'),
    );
    expect(publicBranch).not.toContain('auth.getSession');
    expect(publicBranch).not.toContain('auth.getUser');
  });

  it('caches public work metadata and chapters while keeping access checks separate', () => {
    const queries = read('src/lib/db/queries.ts');
    expect(queries).toContain('getCachedPublicWorkBySlug');
    expect(queries).toContain('getCachedPublicChapters');
    expect(queries).toMatch(/\['public-work-by-slug-v2'\],[\s\S]{0,30}\{ revalidate: 60/);
    expect(queries).toContain('is_preview_free');
  });

  it('skips paid access reads for free works and loads wallet only for a paywall', () => {
    const queries = read('src/lib/db/queries.ts');
    expect(queries).toContain("const needsPaidAccessState = work.access_type !== 'free'");
    expect(queries).toContain('needsPaidAccessState && entitlements.length === 0');
    expect(queries).toContain('if (userId && !accessEval.canRead)');
  });

  it('keeps public home discovery anonymous and CDN-cacheable', () => {
    const tabs = read('src/components/home/HomeDiscoveryTabs.tsx');
    const route = read('src/app/api/home/discovery/route.ts');
    expect(tabs).toContain("tab === 'siz-uchun' || tab === 'kuzatayotganlarim'");
    expect(route).toContain('public, s-maxage=60, stale-while-revalidate=300');
    expect(route).toContain("publicDiscoveryResponse({ success: true, tab: 'yangi'");
    expect(route).toContain("publicDiscoveryResponse({ success: true, tab: 'ommabop'");
  });

  it('caches the public author landing commission setting and invalidates it on update', () => {
    const landing = read('src/app/muallif-boling/page.tsx');
    const settings = read('src/app/api/admin/settings/route.ts');
    expect(landing).toContain('getCachedCommissionPercentage');
    expect(landing).toContain("tags: ['platform-settings']");
    expect(settings).toContain("revalidateTag('platform-settings')");
  });

  it('does not duplicate the global brand suffix in page titles', () => {
    expect(read('src/app/plus/page.tsx')).not.toContain('| Manbora');
    expect(read('src/app/muallif/analitika/page.tsx')).not.toContain('| Manbora');
  });

  it('loads public work data and viewer identity in parallel', () => {
    const page = read('src/app/asarlar/[slug]/page.tsx');
    expect(page).toContain('Promise.all([profilePromise, publicWorkPromise])');
    expect(page).toMatch(/Promise\.all\(\[\s*accessPromise,\s*followPromise,?\s*\]\)/);
  });

  it('renders the cabinet shell without blocking on duplicate server-side user queries', () => {
    const page = read('src/app/kabinet/page.tsx');
    expect(page).not.toContain('getCurrentProfile');
    expect(page).not.toContain('getRecentReadingProgress');
    expect(page).toContain('<KabinetClient />');
  });

  it('loads cabinet data by visible tab and bounds large history queries', () => {
    const cabinet = read('src/app/kabinet/KabinetClient.tsx');
    expect(cabinet).toContain("tab === 'finances' ? 'finances'");
    expect(cabinet).toContain('loadedTabsRef.current.has(dataGroup)');
    expect(cabinet).not.toContain(".from('library_items')");
    expect(cabinet).toContain("fetch('/api/bookmarks?limit=6'");
  });
});
