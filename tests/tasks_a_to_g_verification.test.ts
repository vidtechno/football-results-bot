import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('TASK A — Work Completion Status & Genre Moderation Pipeline', () => {
  it('migration 029 defines completion_status, genre_ids, and atomic approve_work_revision RPC', () => {
    const mig = read('supabase/migrations/029_completion_revision_and_performance_fixes.sql');
    expect(mig).toContain('ALTER TABLE public.work_revisions');
    expect(mig).toContain('ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20)');
    expect(mig).toContain('ADD COLUMN IF NOT EXISTS genre_ids UUID[]');
    expect(mig).toContain('CREATE OR REPLACE FUNCTION public.approve_work_revision');
    expect(mig).toContain('completion_status = v_new_completion_status');
    expect(mig).toContain('DELETE FROM public.work_genres WHERE work_id = v_rev.work_id');
    expect(mig).toContain('prev_completion_status');
    expect(mig).toContain('new_completion_status');
  });

  it('save route persists proposed completion_status and genre_ids for published works', () => {
    const saveRoute = read('src/app/api/works/save/route.ts');
    expect(saveRoute).toContain('completion_status: completionStatus');
    expect(saveRoute).toContain('genre_ids: genreIds');
    expect(saveRoute).toContain('isPublished');
  });

  it('admin revision approval updates works.completion_status and work_genres in fallback path', () => {
    const revAction = read('src/app/api/admin/revisions-action/route.ts');
    expect(revAction).toContain('updateData.completion_status = revBefore.completion_status');
    expect(revAction).toContain('dispatchWorkCompletionNotifications');
    expect(revAction).toContain('revalidatePath(`/asarlar/${workSlug}`)');
  });

  it('tahrirlar page UI shows Hozirgi holat and Taklif etilgan holat with Uzbek labels', () => {
    const tahrirlar = read('src/app/diyoration/tahrirlar/page.tsx');
    expect(tahrirlar).toContain('Hozirgi holat:');
    expect(tahrirlar).toContain('Taklif etilgan holat:');
    expect(tahrirlar).toContain('Davom etmoqda');
    expect(tahrirlar).toContain('Tugallangan');
  });
});

describe('TASK B — Desktop Reader Text Centering & Layout Gutters', () => {
  it('reserves an explicit desktop right-tools gutter on header and main container', () => {
    const reader = read('src/components/reader/ReaderView.tsx');
    expect(reader).toContain('xl:pr-[280px]');
    expect(reader).toContain('max-w-xl');
    expect(reader).toContain('max-w-2xl');
    expect(reader).toContain('max-w-4xl');
  });
});

describe('TASK C — Reader Query Performance & Paid Content Protection', () => {
  it('getChapterForReading only queries chapter_contents.content when reader is authorized', () => {
    const queries = read('src/lib/db/queries.ts');
    expect(queries).toContain('export async function getChapterForReading');
    expect(queries).toContain('if (accessEval.canRead) {');
    expect(queries).toContain(".from('chapter_contents')");
    expect(queries).toContain("let content = '';");
  });

  it('defers non-critical background analytics and notification fetching', () => {
    const analytics = read('src/components/analytics/AnalyticsTracker.tsx');
    const workAnalytics = read('src/components/analytics/WorkAnalyticsTracker.tsx');
    const notifProvider = read('src/components/providers/NotificationProvider.tsx');

    expect(analytics).toContain('requestIdleCallback');
    expect(workAnalytics).toContain('requestIdleCallback');
    expect(notifProvider).toContain('requestIdleCallback');
  });
});

describe('TASK D — Work Detail Page Performance & Stats Caching', () => {
  it('provides lightweight getWorkMetadataBySlug for generateMetadata', () => {
    const queries = read('src/lib/db/queries.ts');
    const workPage = read('src/app/asarlar/[slug]/page.tsx');

    expect(queries).toContain('export async function getWorkMetadataBySlug');
    expect(workPage).toContain('getWorkMetadataBySlug(params.slug)');
  });

  it('caches public work stats with 30s TTL and calls get_work_public_stats RPC', () => {
    const statsRoute = read('src/app/api/works/[id]/stats/route.ts');
    expect(statsRoute).toContain('get_work_public_stats');
    expect(statsRoute).toContain('CACHE_TTL_MS = 30 * 1000');
    expect(statsRoute).toContain('Cache-Control');
  });
});

describe('TASK E — SEO Audit, Scalable Sitemap & Private Areas Noindex', () => {
  it('sitemap removes 500 hard limit and omits private author studio /muallif', () => {
    const sitemap = read('src/app/sitemap.ts');
    expect(sitemap).not.toContain('limit: 500');
    expect(sitemap).not.toContain("url: `${baseUrl}/muallif`");
    expect(sitemap).toContain("url: `${baseUrl}/mualliflar`");
  });

  it('robots.txt disallows private studio/admin/auth paths while safeguarding public paths', () => {
    const robots = read('src/app/robots.ts');
    expect(robots).toContain("'/diyoration'");
    expect(robots).toContain("'/kabinet'");
    expect(robots).toContain("'/muallif$'");
    expect(robots).toContain("'/muallif/'");
    expect(robots).toContain("'/mualliflar'");
    expect(robots).toContain("'/asarlar'");
  });

  it('defense-in-depth noindex metadata is applied to admin, author studio, kabinet, and auth layouts', () => {
    const adminLayout = read('src/app/diyoration/layout.tsx');
    const authorLayout = read('src/app/muallif/layout.tsx');
    const kabinetLayout = read('src/app/kabinet/layout.tsx');
    const authLayout = read('src/app/(auth)/layout.tsx');

    expect(adminLayout).toContain('index: false');
    expect(authorLayout).toContain('index: false');
    expect(kabinetLayout).toContain('index: false');
    expect(authLayout).toContain('index: false');
  });

  it('work detail page Book JSON-LD contains rich structured data properties', () => {
    const workPage = read('src/app/asarlar/[slug]/page.tsx');
    expect(workPage).toContain("'@type': 'Book'");
    expect(workPage).toContain('datePublished');
    expect(workPage).toContain('dateModified');
    expect(workPage).toContain('inLanguage');
    expect(workPage).toContain('genre');
  });
});

describe('TASK F — Production Environment & Auth Robustness', () => {
  it('middleware handles chunked @supabase/ssr auth token cookies', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain('auth-token');
    expect(middleware).toContain('isProtectedPath');
  });

  it('server client enforces production Supabase environment validation', () => {
    const serverSupabase = read('src/lib/supabase/server.ts');
    expect(serverSupabase).toContain('getValidatedSupabaseEnv');
    expect(serverSupabase).toContain('Ishlab chiqarish (production) muhitida');
  });
});
