import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('first-party analytics and guest reading gate', () => {
  it('stores privacy-conscious analytics behind RLS', () => {
    const sql = read('supabase/migrations/027_internal_analytics.sql');
    expect(sql).toContain('analytics_events');
    expect(sql).toContain('analytics_presence');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  });
  it('blocks direct guest access after the first chapter', () => {
    const page = read('src/app/asarlar/[slug]/[chapterSlug]/page.tsx');
    expect(page).toContain("!profile && allChapters[0]?.id !== chapter.id");
    expect(page).toContain('reason=continue-reading');
  });
  it('shows registration and login choices at the reader boundary', () => {
    const reader = read('src/components/reader/ReaderView.tsx');
    expect(reader).toContain('showSignupGate');
    expect(reader).toContain('Ro‘yxatdan o‘tish');
    expect(reader).toContain('signup_gate');
  });
  it('provides public work stats and admin analytics', () => {
    expect(read('src/components/analytics/PublicWorkStats.tsx')).toContain('/api/works/');
    expect(read('src/app/diyoration/dashboard/page.tsx')).toContain('AdminAnalyticsOverview');
    expect(read('src/app/api/admin/analytics/route.ts')).toContain('verifyAdminProfile');
  });
  it('counts each registered account once and excludes guests', () => {
    const sql = read('supabase/migrations/028_unique_authenticated_work_views.sql');
    const endpoint = read('src/app/api/analytics/track/route.ts');
    expect(sql).toContain('PRIMARY KEY (work_id, user_id)');
    expect(endpoint).toContain('if (!profile');
    expect(endpoint).toContain("from('work_views').upsert");
    expect(read('src/app/api/works/[id]/stats/route.ts')).toContain("from('work_views')");
  });
});
