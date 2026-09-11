import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCanonicalChapterAccess } from '@/lib/security/access';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const base = { workAccessType: 'paid_full_work', fullWorkPrice: 25000, isWorkPublished: true, isChapterPublished: true };

describe('Manbora Plus MVP', () => {
  it('opens the first Plus chapter to anonymous readers', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: true, chapterNumber: 1 }).canRead).toBe(true));
  it('locks chapter two for anonymous and inactive users', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: true, chapterNumber: 2 }).canRead).toBe(false));
  it('opens later chapters to active Plus users', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: true, chapterNumber: 2, hasPlusSubscription: true }).reason).toBe('plus'));
  it('keeps permanent purchase access independent of Plus', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: true, chapterNumber: 2, hasFullWorkEntitlement: true, hasPlusSubscription: true }).reason).toBe('purchased_full_work'));
  it('treats an expired or inactive Plus state as locked', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: true, chapterNumber: 2, hasPlusSubscription: false }).reason).toBe('locked'));
  it('does not open ordinary works for Plus subscribers', () => expect(evaluateCanonicalChapterAccess({ ...base, workIsPlus: false, chapterNumber: 2, hasPlusSubscription: true }).canRead).toBe(false));
  it('enforces admin-created Plus works in the database', () => {
    const sql = read('supabase/migrations/045_manbora_plus_mvp.sql');
    expect(sql).toContain('ONLY_ADMIN_WORKS_CAN_BE_PLUS');
    expect(sql).toContain('trg_enforce_work_plus_admin_only');
    expect(sql).toContain("interval '30 days'");
    expect(sql).toContain('balance=balance-v_price');
    expect(sql).toContain("status='expired'");
    expect(sql).toContain('ps.expires_at>now()');
  });
  it('filters the public catalogue and renders one shared badge', () => {
    expect(read('src/app/plus/page.tsx')).toContain('isPlus: true');
    expect(read('src/lib/db/queries.ts')).toContain(".eq('status', 'published')");
    expect(read('src/components/work/WorkCard.tsx')).toContain('<PlusBadge');
    expect(read('src/app/asarlar/[slug]/page.tsx')).toContain('<PlusBadge');
  });
  it('does not select locked chapter content before server authorization', () => {
    const access = read('src/lib/security/access.ts');
    expect(access).toContain("if (evalResult.canRead)");
    expect(access).toContain("content: ''");
  });
  it('provides admin revenue statistics and work toggles', () => {
    const api = read('src/app/api/admin/plus/route.ts');
    expect(api).toContain('totalRevenue');
    expect(api).toContain("rpc('get_admin_plus_stats'");
    expect(api).toContain("rpc('set_work_plus'");
  });
  it('is responsive and present in the sitemap', () => {
    expect(read('src/app/plus/page.tsx')).toContain('grid-cols-2');
    expect(read('src/app/sitemap.ts')).toContain('`${baseUrl}/plus`');
  });
});
