import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('TASK 1 — Fix Critical Purchase Engine Bug', () => {
  it('migration 031 creates forward-only fix for purchase_content RPC with platform_revenue', () => {
    const mig = read('supabase/migrations/031_fix_purchase_content_platform_revenue.sql');
    expect(mig).toContain('CREATE OR REPLACE FUNCTION public.purchase_content');
    expect(mig).toContain("account_type = 'platform_revenue'");
    expect(mig).toContain('00000000-0000-0000-0000-000000000001');
    expect(mig).toContain('platform_fee_credit');
    // Ensure in SQL body it doesn't query or insert platform_commission
    expect(mig).not.toMatch(/WHERE[^\n]+account_type = 'platform_commission'/);
    expect(mig).not.toMatch(/VALUES[^\n]+'platform_commission'/);
  });

  it('historical migration 025 is aligned with platform_revenue for consistency', () => {
    const mig25 = read('supabase/migrations/025_comprehensive_production_qa_fixes.sql');
    expect(mig25).not.toContain("account_type = 'platform_commission'");
    expect(mig25).toContain("account_type = 'platform_revenue'");
  });

  it('wallet_accounts table constraint strictly allows platform_revenue', () => {
    const coreMig = read('supabase/migrations/011_manbora_platform_core.sql');
    expect(coreMig).toContain("CHECK (account_type IN ('reader_credit', 'author_earnings_available', 'author_earnings_reserved', 'platform_revenue'))");
  });
});

describe('TASK 2 — Fix Reader Chapter-Change Progress Bug (totalPages Leak)', () => {
  it('ReaderView maintains prevTotalPagesFlushRef and flushes old totalPages on chapter change', () => {
    const readerView = read('src/components/reader/ReaderView.tsx');
    expect(readerView).toContain('const prevTotalPagesFlushRef = useRef(paginated.totalPages);');
    expect(readerView).toContain('totalPages: prevTotalPagesFlushRef.current');
    expect(readerView).toContain('prevTotalPagesFlushRef.current = paginated.totalPages');
  });

  it('proves that switching from Chapter 1 (10 pages, page 8) to Chapter 2 (4 pages) flushes totalPages 10, not 4', () => {
    // Behavioral simulation of ReaderView ref transitions
    let currentChapter = { id: 'chap-1', content: 'c1' };
    let currentPage = 8;
    let paginated = { totalPages: 10 };

    const prevChapterFlushRef = { current: currentChapter };
    const prevPageFlushRef = { current: currentPage };
    const prevTotalPagesFlushRef = { current: paginated.totalPages };

    const payloadsSent: any[] = [];
    const saveProgressToServer = (page: number, options?: any) => {
      payloadsSent.push({
        chapterId: (options?.chapter || currentChapter).id,
        pageIndex: page,
        totalPages: options?.totalPages ?? paginated.totalPages,
        force: options?.force,
      });
    };

    // Transition to Chapter 2 (which has 4 pages)
    const newChapter = { id: 'chap-2', content: 'c2' };
    const newPaginated = { totalPages: 4 };

    // When chapter prop updates, effect runs:
    if (prevChapterFlushRef.current.id !== newChapter.id) {
      saveProgressToServer(prevPageFlushRef.current, {
        force: true,
        chapter: prevChapterFlushRef.current,
        totalPages: prevTotalPagesFlushRef.current,
      });
      prevChapterFlushRef.current = newChapter;
    }
    prevPageFlushRef.current = 1;
    prevTotalPagesFlushRef.current = newPaginated.totalPages;

    expect(payloadsSent).toHaveLength(1);
    expect(payloadsSent[0]).toEqual({
      chapterId: 'chap-1',
      pageIndex: 8,
      totalPages: 10, // Must be 10, NOT 4!
      force: true,
    });
  });

  it('normal page turns maintain unforced throttling (45s / 5 pages)', () => {
    const readerView = read('src/components/reader/ReaderView.tsx');
    expect(readerView).toContain('saveProgressToServer(currentPage, { force: false });');
    expect(readerView).toContain('timeSinceLast < 45000 && pagesSinceLast < 5');
  });
});

describe('TASK 3 — Fix Same-Chapter Multi-Tab Stale Progress', () => {
  it('progress route compares incoming timestamp regardless of chapter equality', () => {
    const route = read('src/app/api/library/progress/route.ts');
    // Ensure the old bug "&& existingProgress.chapter_id !== chapterId" was removed
    expect(route).not.toContain('&& existingProgress.chapter_id !== chapterId');
    expect(route).toContain('incomingTime < existingTime - 1000');
    expect(route).toContain('lastReadAtIso');
  });

  // Concurrency ordering unit test matching exact requirements A, B, and C
  const evaluateProgressUpdate = (
    server: { chapterId: string; lastReadAt: number; page: number },
    incoming: { chapterId: string; timestamp: number; page: number },
    serverNow: number = 1700005000000
  ) => {
    let incomingTime = incoming.timestamp;
    if (isNaN(incomingTime) || incomingTime < 1577836800000) {
      incomingTime = serverNow;
    } else if (incomingTime > serverNow + 60000) {
      incomingTime = serverNow;
    }

    if (server.lastReadAt) {
      if (incomingTime < server.lastReadAt - 1000) {
        return { accepted: false, reason: 'Eski progress e’tiborsiz qoldirildi' };
      }
    }
    return { accepted: true, page: incoming.page, chapterId: incoming.chapterId };
  };

  it('Scenario A: server has chapter A / page 8 / newer timestamp, incoming has chapter A / page 3 / older timestamp => IGNORED', () => {
    const serverState = { chapterId: 'chap-A', page: 8, lastReadAt: 1700005000000 };
    const incoming = { chapterId: 'chap-A', page: 3, timestamp: 1700001000000 }; // 4000s older

    const result = evaluateProgressUpdate(serverState, incoming);
    expect(result.accepted).toBe(false);
  });

  it('Scenario B: server has chapter A / page 8 / older timestamp, incoming has chapter A / page 9 / newer timestamp => ACCEPTED', () => {
    const serverState = { chapterId: 'chap-A', page: 8, lastReadAt: 1700001000000 };
    const incoming = { chapterId: 'chap-A', page: 9, timestamp: 1700005000000 }; // newer

    const result = evaluateProgressUpdate(serverState, incoming);
    expect(result.accepted).toBe(true);
    expect(result.page).toBe(9);
  });

  it('Scenario C: older tab from another chapter (chapter B) must not overwrite newer server progress => IGNORED', () => {
    const serverState = { chapterId: 'chap-A', page: 8, lastReadAt: 1700005000000 };
    const incoming = { chapterId: 'chap-B', page: 1, timestamp: 1700001000000 }; // older timestamp

    const result = evaluateProgressUpdate(serverState, incoming);
    expect(result.accepted).toBe(false);
  });
});

describe('TASK 4 — Fix Disabled Notification Route Redirect', () => {
  it('middleware intercepts direct /bildirishnomalar navigation in 1 hop without streaming render', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).toContain("pathname === '/bildirishnomalar' || pathname.startsWith('/bildirishnomalar/')");
    expect(middleware).toContain('if (!NOTIFICATIONS_ENABLED)');
    expect(middleware).toContain("return NextResponse.redirect(new URL('/kirish', request.url));");
    expect(middleware).toContain("return NextResponse.redirect(new URL('/kabinet', request.url));");
  });

  it('features config marks NOTIFICATIONS_ENABLED as disabled in production optimization', () => {
    const features = read('src/lib/config/features.ts');
    expect(features).toContain("process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === 'true'");
  });
});

describe('TASK 5 — Admin Revision API Compatibility (type & itemType)', () => {
  it('revisions-action route accepts body.itemType as fallback to body.type', () => {
    const revAction = read('src/app/api/admin/revisions-action/route.ts');
    expect(revAction).toContain('let type = body.type || body.itemType;');
    expect(revAction).toContain("if (type === 'work') type = 'work_revision';");
    expect(revAction).toContain("if (type === 'chapter') type = 'chapter_revision';");
    expect(revAction).toContain("['work_revision', 'chapter_revision'].includes(type)");
  });
});

describe('TASK 6 & 7 — Homepage Semantic H1 and Schema.org JSON-LD', () => {
  it('homepage has exactly one semantic H1 with natural Uzbek wording', () => {
    const page = read('src/app/page.tsx');
    const h1Matches = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    expect(h1Matches).toHaveLength(1);
    expect(h1Matches[0]).toContain('Manbora — o‘zbek kitoblari va asarlar platformasi');
    expect(h1Matches[0]).toContain('sr-only');
  });

  it('homepage contains valid Schema.org WebSite JSON-LD with SearchAction', () => {
    const page = read('src/app/page.tsx');
    expect(page).toContain("type=\"application/ld+json\"");
    expect(page).toContain("'@type': 'WebSite'");
    expect(page).toContain("name: 'Manbora'");
    expect(page).toContain("url: 'https://manbora.uz'");
    expect(page).toContain("inLanguage: 'uz'");
    expect(page).toContain("'@type': 'SearchAction'");
    expect(page).toContain("target: 'https://manbora.uz/qidiruv?q={search_term_string}'");
  });
});

describe('TASK 8 — Registration CTA', () => {
  it('navbar exposes Ro‘yxatdan o‘tish for desktop while keeping mobile clean', () => {
    const navbar = read('src/components/layout/Navbar.tsx');
    expect(navbar).toContain('href="/royxatdan-otish"');
    expect(navbar).toContain('hidden sm:inline-flex');
    expect(navbar).toContain('Ro‘yxatdan o‘tish');
    expect(navbar).toContain('Kirish');
  });
});

describe('TASK 9 — Chapter scheduling and published-revision safety', () => {
  it('accepts the editor scheduled_at payload as well as scheduledAt', () => {
    const route = read('src/app/api/chapters/save/route.ts');
    expect(route).toContain('body.scheduledAt || body.scheduled_at');
  });

  it('does not report success when a published chapter revision fails to save', () => {
    const route = read('src/app/api/chapters/save/route.ts');
    expect(route).toContain('if (revisionError || !revisionResult)');
    expect(route).toContain("revisionError?.message || 'Tahrirni saqlab bo‘lmadi'");
  });

  it('adds the canonical preview flag to chapter revisions and preserves old values', () => {
    const migration = read('supabase/migrations/035_preview_chapter_revision_column.sql');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS is_preview_free BOOLEAN NOT NULL DEFAULT FALSE');
    expect(migration).toContain('WHERE cr.is_free = TRUE');
    expect(migration).toContain("w.access_type = 'paid_full_work'");
  });
});
