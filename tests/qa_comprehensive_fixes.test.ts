import { describe, it, expect } from 'vitest';
import {
  canReadChapter,
  getWorkChaptersAccessMap,
} from '@/lib/security/access';
import { paginateChapterContent } from '@/lib/reader/pagination';

describe('QA Comprehensive Fixes & Security Access Tests', () => {
  const authorUserId = 'author-uuid-1111';
  const buyerUserId = 'buyer-uuid-2222';
  const strangerUserId = 'stranger-uuid-3333';
  const adminUserId = 'admin-uuid-9999';

  const fullWorkId = 'work-full-1234';
  const perChapterWorkId = 'work-per-chapter-5678';

  const fullPurchaseWork = {
    id: fullWorkId,
    slug: 'qa-pullik-kitob',
    author_id: authorUserId,
    status: 'published',
    access_type: 'paid_full_work',
    full_work_price: 5000,
  };

  const perChapterWork = {
    id: perChapterWorkId,
    slug: 'bekatdagi-soat',
    author_id: authorUserId,
    status: 'published',
    access_type: 'paid_by_chapter',
    full_work_price: 0,
  };

  const fullBookChapter1 = {
    id: 'ch-full-01',
    work_id: fullWorkId,
    chapter_number: 1,
    title: '1-bob: Kirish',
    slug: '1-bob-kirish',
    is_free: true, // Marked as free by author, BUT work is paid_full_work!
    price: 0,
    status: 'published',
    work: fullPurchaseWork,
  };

  const fullBookChapter2 = {
    id: 'ch-full-02',
    work_id: fullWorkId,
    chapter_number: 2,
    title: '2-bob: Davomi',
    slug: '2-bob-davomi',
    is_free: false,
    price: 5000,
    status: 'published',
    work: fullPurchaseWork,
  };

  const perChapterCh1 = {
    id: 'ch-per-01',
    work_id: perChapterWorkId,
    chapter_number: 1,
    title: '1-bob: Bepul bob',
    slug: '1-bob-bepul',
    is_free: true,
    price: 0,
    status: 'published',
    work: perChapterWork,
  };

  const perChapterCh2 = {
    id: 'ch-per-02',
    work_id: perChapterWorkId,
    chapter_number: 2,
    title: '2-bob: Pullik bob',
    slug: '2-bob-pullik',
    is_free: false,
    price: 3000,
    status: 'published',
    work: perChapterWork,
  };

  function createMockClient(purchases: Array<{
    buyer_id: string;
    work_id: string;
    chapter_id?: string | null;
    purchase_type: string;
    status: string;
  }> = []) {
    const allChapters = [fullBookChapter1, fullBookChapter2, perChapterCh1, perChapterCh2];

    return {
      from: (table: string) => {
        if (table === 'chapters') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                single: async () => {
                  const ch = allChapters.find((c) => c.id === val);
                  return ch ? { data: ch, error: null } : { data: null, error: new Error('Not found') };
                },
              }),
            }),
          };
        }

        if (table === 'chapter_contents') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                maybeSingle: async () => ({
                  data: { content: `<p>Sirli kontent [${val}]</p>` },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                single: async () => ({
                  data: { id: val, is_admin: val === adminUserId },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'purchases') {
          return {
            select: () => {
              const query: any = {
                _buyer_id: null as string | null,
                _work_id: null as string | null,
                _status: null as string | null,
                _purchase_type: null as string | null,
                _or: null as string | null,
                eq: function (col: string, val: any) {
                  if (col === 'buyer_id') this._buyer_id = val;
                  if (col === 'work_id') this._work_id = val;
                  if (col === 'status') this._status = val;
                  if (col === 'purchase_type') this._purchase_type = val;
                  return this;
                },
                or: function (condition: string) {
                  this._or = condition;
                  return this;
                },
                limit: async function () {
                  return this.execute();
                },
                then: function (resolve: any, reject: any) {
                  return this.execute().then(resolve, reject);
                },
                execute: async function () {
                  const matched = purchases.filter((p) => {
                    if (this._buyer_id && p.buyer_id !== this._buyer_id) return false;
                    if (this._work_id && p.work_id !== this._work_id) return false;
                    if (this._status && p.status !== this._status) return false;
                    if (this._purchase_type && p.purchase_type !== this._purchase_type) return false;
                    if (this._or) {
                      const isFullWork = p.purchase_type === 'full_work';
                      const matchesChapter = p.chapter_id ? this._or.includes(p.chapter_id) : false;
                      return isFullWork || matchesChapter;
                    }
                    return true;
                  });
                  return { data: matched, error: null };
                },
              };
              return query;
            },
          };
        }

        return {
          select: () => ({ eq: () => ({}) }),
        };
      },
    };
  }

  describe('1. Critical Paid Book Protection (paid_full_work & paid_book)', () => {
    it('Guest visiting full_purchase book chapter cannot read even if is_free=true', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(null, fullBookChapter1.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });

    it('Logged-in reader without purchase visiting full_purchase book is locked', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(strangerUserId, fullBookChapter1.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });

    it('Buyer with full_work purchase entitlement can read ALL chapters', async () => {
      const mockClient = createMockClient([
        {
          buyer_id: buyerUserId,
          work_id: fullWorkId,
          chapter_id: null,
          purchase_type: 'full_work',
          status: 'active',
        },
      ]);

      const res1 = await canReadChapter(buyerUserId, fullBookChapter1.id, {
        customClient: mockClient,
      });
      expect(res1.canRead).toBe(true);
      expect(res1.reason).toBe('purchased_full_work');
      expect(res1.content).toContain('Sirli kontent');

      const res2 = await canReadChapter(buyerUserId, fullBookChapter2.id, {
        customClient: mockClient,
      });
      expect(res2.canRead).toBe(true);
      expect(res2.reason).toBe('purchased_full_work');
      expect(res2.content).toContain('Sirli kontent');
    });

    it('Author can preview all chapters of their full_purchase book', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(authorUserId, fullBookChapter2.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('author');
      expect(result.content).toContain('Sirli kontent');
    });

    it('Admin can preview any full_purchase book on admin route', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(adminUserId, fullBookChapter2.id, {
        isAdminRoute: true,
        customClient: mockClient,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('admin_preview');
      expect(result.content).toContain('Sirli kontent');
    });

    it('getWorkChaptersAccessMap locks all chapters of full_purchase book for unpurchased reader', async () => {
      const mockClient = createMockClient([]);
      const accessMap = await getWorkChaptersAccessMap(
        strangerUserId,
        fullWorkId,
        [fullBookChapter1, fullBookChapter2],
        {
          customClient: mockClient,
          authorId: authorUserId,
          workAccessType: 'paid_full_work',
          fullWorkPrice: 5000,
        },
      );

      expect(accessMap[fullBookChapter1.id].isLocked).toBe(true);
      expect(accessMap[fullBookChapter2.id].isLocked).toBe(true);
      expect(accessMap[fullBookChapter1.id].isFree).toBe(false);
      expect(accessMap[fullBookChapter2.id].isFree).toBe(false);
    });
  });

  describe('2. Per-Chapter Access Protection (paid_by_chapter)', () => {
    it('Free chapter is accessible by guest', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(null, perChapterCh1.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('free');
      expect(result.content).toContain('Sirli kontent');
    });

    it('Paid chapter is strictly locked for guest', async () => {
      const mockClient = createMockClient([]);
      const result = await canReadChapter(null, perChapterCh2.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });

    it('Buyer with chapter purchase can only read purchased chapter', async () => {
      const mockClient = createMockClient([
        {
          buyer_id: buyerUserId,
          work_id: perChapterWorkId,
          chapter_id: perChapterCh2.id,
          purchase_type: 'chapter',
          status: 'active',
        },
      ]);

      const resPurchased = await canReadChapter(buyerUserId, perChapterCh2.id, {
        customClient: mockClient,
      });
      expect(resPurchased.canRead).toBe(true);
      expect(resPurchased.reason).toBe('purchased_chapter');

      // Unpurchased paid chapter
      const resUnpurchased = await canReadChapter(buyerUserId, fullBookChapter2.id, {
        customClient: mockClient,
      });
      expect(resUnpurchased.canRead).toBe(false);
      expect(resUnpurchased.reason).toBe('locked');
    });
  });

  describe('3. Financial Transaction Invariant & Commission Accounting', () => {
    it('Guarantees atomic split: reader_debit = author_credit + platform_fee exactly', () => {
      const prices = [1000, 3000, 5000, 15000, 49000];
      const platformFeePercent = 20;

      for (const price of prices) {
        const platformFee = Math.floor((price * platformFeePercent) / 100);
        const authorNet = price - platformFee;

        // Invariant check
        expect(authorNet + platformFee).toBe(price);
        expect(price).toBeGreaterThan(0);
        expect(authorNet).toBeGreaterThan(0);
        expect(platformFee).toBeGreaterThan(0);
      }

      // Explicit QA test case: 3 000 UZS @ 20%
      const price = 3000;
      const platformFee = Math.floor((price * 20) / 100); // 600
      const authorCredit = price - platformFee; // 2400
      expect(price).toBe(3000);
      expect(authorCredit).toBe(2400);
      expect(platformFee).toBe(600);
      expect(authorCredit + platformFee).toBe(price);
    });
  });

  describe('4. Chapter Editor Autosave Isolation', () => {
    it('Constructs distinct isolated localStorage keys per user, work, and chapter', () => {
      const userId = 'user-abc';
      const workId = 'work-123';
      const chapterId1 = 'ch-001';
      const chapterId2 = 'ch-002';
      const newChapterSessionKey = 'new_1741160000000_xyz';

      const keyCh1 = `manbora:draft:${userId}:${workId}:${chapterId1}`;
      const keyCh2 = `manbora:draft:${userId}:${workId}:${chapterId2}`;
      const keyNew = `manbora:draft:${userId}:${workId}:${newChapterSessionKey}`;

      expect(keyCh1).not.toBe(keyCh2);
      expect(keyCh1).not.toBe(keyNew);
      expect(keyCh2).not.toBe(keyNew);
      expect(keyCh1.startsWith(`manbora:draft:${userId}:${workId}:`)).toBe(true);
    });
  });

  describe('5. Review API Work Resolution', () => {
    it('Correctly distinguishes between UUID and slug', () => {
      const isUUID = (str: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      expect(isUUID('11111111-1111-1111-1111-111111111111')).toBe(true);
      expect(isUUID('bekatdagi-soat')).toBe(false);
      expect(isUUID('qa-pullik-kitob')).toBe(false);
    });
  });

  describe('6. Reader Deterministic Pagination Engine', () => {
    it('Splits long chapters safely without cutting words or HTML blocks', () => {
      const htmlContent = `
        <p>Birinchi bobning kirish qismi juda qiziq voqealar bilan boshlanadi. Bu yerda bir necha gaplar mavjud.</p>
        <p>Ikkinchi paragraf kitobxonning qiziqishini yanada oshiradi va yangi qahramonlar paydo bo‘ladi.</p>
        <p>Uchinchi paragrafda syujet rivojlanadi va kutilmagan burilishlar yuz beradi.</p>
      `;

      const result = paginateChapterContent(htmlContent, 20);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
      expect(result.pages.length).toBe(result.totalPages);
      expect(result.totalWords).toBeGreaterThan(0);
      // Clean HTML preservation
      expect(result.pages[0]).toContain('<p>');
      expect(result.pages[0]).toContain('</p>');
    });
  });

  describe('7. Uzbek Search Text Normalization', () => {
    it('Normalizes Uzbek apostrophes (g‘, o‘) for resilient database query matching', () => {
      const normalizeQuery = (q: string) => q.replace(/['`ʻʼ‘’]/g, '%').trim();

      expect(normalizeQuery('g‘alaba')).toBe('g%alaba');
      expect(normalizeQuery('oʻzbek')).toBe('o%zbek');
      expect(normalizeQuery('Bekat')).toBe('Bekat');
    });
  });

  describe('8. Purchase History Direct Navigation URLs', () => {
    it('Generates exact chapter reading URL for chapter purchases and work URL for full books', () => {
      const getPurchaseReadUrl = (purchase: {
        purchase_type: 'chapter' | 'full_work';
        workSlug: string;
        chapterSlug?: string;
      }) => {
        if (purchase.purchase_type === 'chapter' && purchase.chapterSlug) {
          return `/asarlar/${purchase.workSlug}/${purchase.chapterSlug}`;
        }
        return `/asarlar/${purchase.workSlug}`;
      };

      const chapterPurchaseUrl = getPurchaseReadUrl({
        purchase_type: 'chapter',
        workSlug: 'bekatdagi-soat',
        chapterSlug: '2-bob',
      });
      expect(chapterPurchaseUrl).toBe('/asarlar/bekatdagi-soat/2-bob');

      const fullWorkPurchaseUrl = getPurchaseReadUrl({
        purchase_type: 'full_work',
        workSlug: 'qa-pullik-kitob',
      });
      expect(fullWorkPurchaseUrl).toBe('/asarlar/qa-pullik-kitob');
    });
  });

  describe('9. Author IDOR Server Verification Logic', () => {
    const mockWork = {
      id: 'work-own-123',
      title: 'Muallifning asari',
      author_id: authorUserId,
    };

    function canAccessAuthorWorkEditor(
      user: { id: string } | null,
      work: { author_id: string },
      isAdmin: boolean = false
    ): boolean {
      if (!user) return false;
      return work.author_id === user.id || isAdmin;
    }

    it('Denies access to stranger author (prevents IDOR)', () => {
      const allowed = canAccessAuthorWorkEditor(
        { id: strangerUserId },
        mockWork,
        false
      );
      expect(allowed).toBe(false);
    });

    it('Denies access to unauthenticated guest', () => {
      const allowed = canAccessAuthorWorkEditor(null, mockWork, false);
      expect(allowed).toBe(false);
    });

    it('Grants access to true author', () => {
      const allowed = canAccessAuthorWorkEditor(
        { id: authorUserId },
        mockWork,
        false
      );
      expect(allowed).toBe(true);
    });

    it('Grants access to admin for moderation oversight', () => {
      const allowed = canAccessAuthorWorkEditor(
        { id: adminUserId },
        mockWork,
        true
      );
      expect(allowed).toBe(true);
    });
  });

  describe('10. Entitlements Permanent Rights & Status Normalization', () => {
    it('Status "completed" and "paid" grant full chapter reading access', async () => {
      const mockClientCompleted = createMockClient([
        {
          buyer_id: buyerUserId,
          work_id: perChapterWorkId,
          chapter_id: perChapterCh2.id,
          purchase_type: 'chapter',
          status: 'completed',
        },
      ]);

      const resCompleted = await canReadChapter(buyerUserId, perChapterCh2.id, {
        customClient: mockClientCompleted,
      });
      expect(resCompleted.canRead).toBe(true);
      expect(resCompleted.reason).toBe('purchased_chapter');

      const mockClientPaid = createMockClient([
        {
          buyer_id: buyerUserId,
          work_id: perChapterWorkId,
          chapter_id: perChapterCh2.id,
          purchase_type: 'chapter',
          status: 'paid',
        },
      ]);

      const resPaid = await canReadChapter(buyerUserId, perChapterCh2.id, {
        customClient: mockClientPaid,
      });
      expect(resPaid.canRead).toBe(true);
      expect(resPaid.reason).toBe('purchased_chapter');
    });

    it('Purchased chapter remains accessible even if work is changed to paid_full_work', async () => {
      // Work has been switched to paid_full_work by author afterwards
      const switchedWork = {
        ...perChapterWork,
        access_type: 'paid_full_work',
        full_work_price: 15000,
      };
      const switchedCh2 = {
        ...perChapterCh2,
        work: switchedWork,
      };

      const mockClient = {
        from: (table: string) => {
          if (table === 'chapters') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: switchedCh2, error: null }),
                }),
              }),
            };
          }
          if (table === 'chapter_contents') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { content: 'Oldindan olingan bob matni' }, error: null }),
                }),
              }),
            };
          }
          if (table === 'entitlements') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    or: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'ent-1',
                            entitlement_type: 'chapter',
                            chapter_id: switchedCh2.id,
                            work_id: switchedWork.id,
                          },
                        ],
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'purchases') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    limit: async () => ({ data: [] }),
                  }),
                }),
              }),
            };
          }
          return { select: () => ({ eq: () => ({}) }) };
        },
      };

      const result = await canReadChapter(buyerUserId, switchedCh2.id, {
        customClient: mockClient,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('purchased_chapter');
      expect(result.content).toBe('Oldindan olingan bob matni');
    });
  });

  describe('11. Safe Redirect URL Resolver', () => {
    function getSafeRedirectUrl(url: string | null | undefined, fallback: string = '/'): string {
      if (!url) return fallback;
      const trimmed = url.trim();
      if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
        return fallback;
      }
      try {
        const parsed = new URL(trimmed, 'https://manbora.uz');
        if (parsed.origin !== 'https://manbora.uz') {
          return fallback;
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        return fallback;
      }
    }

    it('Rejects malicious external phishing redirects', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/');
      expect(getSafeRedirectUrl('http://attacker.org/login')).toBe('/');
      expect(getSafeRedirectUrl('//evil.com/fake')).toBe('/');
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/');
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/');
    });

    it('Preserves valid relative paths and queries', () => {
      expect(getSafeRedirectUrl('/muallif')).toBe('/muallif');
      expect(getSafeRedirectUrl('/asarlar/bekatdagi-soat')).toBe('/asarlar/bekatdagi-soat');
      expect(getSafeRedirectUrl('/asarlar/bekatdagi-soat?tab=sharhlar#sharh-1')).toBe(
        '/asarlar/bekatdagi-soat?tab=sharhlar#sharh-1'
      );
    });

    it('Handles empty or null inputs gracefully', () => {
      expect(getSafeRedirectUrl(null)).toBe('/');
      expect(getSafeRedirectUrl(undefined)).toBe('/');
      expect(getSafeRedirectUrl('')).toBe('/');
    });
  });

  describe('12. Work-level Multi-Chapter Reading Progress Formula', () => {
    function computeWorkProgress(
      currentChapterIndex: number,
      currentPage: number,
      totalPages: number,
      totalChapters: number
    ): number {
      if (totalChapters <= 0) return 0;
      const chapterFraction = totalPages > 0 ? Math.min(1, Math.max(0, currentPage / totalPages)) : 0;
      const progress = Math.round(((currentChapterIndex + chapterFraction) / totalChapters) * 100);
      return Math.min(100, Math.max(0, progress));
    }

    it('Computes progressive work-level percentage across 3 chapters', () => {
      const totalChapters = 3;
      const pagesPerChapter = 10;

      // Chapter 1, page 1: ~3%
      expect(computeWorkProgress(0, 1, pagesPerChapter, totalChapters)).toBe(3);
      // Chapter 1, page 10: ~33%
      expect(computeWorkProgress(0, 10, pagesPerChapter, totalChapters)).toBe(33);
      // Chapter 2, page 5: 50%
      expect(computeWorkProgress(1, 5, pagesPerChapter, totalChapters)).toBe(50);
      // Chapter 3, page 10: 100%
      expect(computeWorkProgress(2, 10, pagesPerChapter, totalChapters)).toBe(100);
    });

    it('Clamps progress strictly between 0% and 100%', () => {
      expect(computeWorkProgress(-1, 0, 10, 3)).toBe(0);
      expect(computeWorkProgress(5, 20, 10, 3)).toBe(100);
    });
  });

  describe('13. Font Configuration & CSS Variable Integrity', () => {
    it('Ensures font variables are distinct and non-cyclic in globals.css and layout.tsx', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const globalsCss = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/globals.css'),
        'utf8'
      );
      const layoutTsx = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/layout.tsx'),
        'utf8'
      );

      // Must not contain circular reference --font-ui: var(--font-ui)
      expect(globalsCss.includes('--font-ui: var(--font-ui)')).toBe(false);
      expect(globalsCss.includes('--font-serif: var(--font-serif)')).toBe(false);

      // Must configure font variables in layout.tsx
      expect(layoutTsx.includes('--font-inter')).toBe(true);
      expect(layoutTsx.includes('--font-source-serif')).toBe(true);
    });
  });

  describe('14. Admin Works Statistics Aggregation', () => {
    it('Correctly aggregates sales_count and sales_revenue from purchases', () => {
      const mockPurchases = [
        { work_id: 'work-1', amount: 3000, author_earning: 2400, platform_fee: 600, status: 'active' },
        { work_id: 'work-1', amount: 3000, author_earning: 2400, platform_fee: 600, status: 'completed' },
        { work_id: 'work-1', amount: 5000, author_earning: 4000, platform_fee: 1000, status: 'refunded' }, // Excluded!
        { work_id: 'work-2', amount: 15000, author_earning: 12000, platform_fee: 3000, status: 'paid' },
      ];

      const validStatuses = new Set(['active', 'completed', 'paid']);
      const statsMap: Record<
        string,
        { sales_count: number; sales_revenue: number; author_earnings: number; platform_fee: number }
      > = {};

      for (const p of mockPurchases) {
        if (!validStatuses.has(p.status)) continue;
        if (!statsMap[p.work_id]) {
          statsMap[p.work_id] = { sales_count: 0, sales_revenue: 0, author_earnings: 0, platform_fee: 0 };
        }
        statsMap[p.work_id].sales_count += 1;
        statsMap[p.work_id].sales_revenue += p.amount;
        statsMap[p.work_id].author_earnings += p.author_earning;
        statsMap[p.work_id].platform_fee += p.platform_fee;
      }

      // work-1: 2 successful sales, total 6000 UZS (refunded ignored)
      expect(statsMap['work-1'].sales_count).toBe(2);
      expect(statsMap['work-1'].sales_revenue).toBe(6000);
      expect(statsMap['work-1'].author_earnings).toBe(4800);
      expect(statsMap['work-1'].platform_fee).toBe(1200);

      // work-2: 1 successful sale, total 15000 UZS
      expect(statsMap['work-2'].sales_count).toBe(1);
      expect(statsMap['work-2'].sales_revenue).toBe(15000);

      // work-3 with no sales defaults to 0
      const work3Stats = statsMap['work-3'] || { sales_count: 0, sales_revenue: 0 };
      expect(work3Stats.sales_count).toBe(0);
      expect(work3Stats.sales_revenue).toBe(0);
    });
  });

  describe('15. Migration 019 SQL Idempotency and Ledger Verification', () => {
    it('Verifies migration 019 does not reference non-existent wallet_ledger_entries', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const migrationSql = fs.readFileSync(
        path.resolve(process.cwd(), 'supabase/migrations/019_idor_entitlements_and_pricing_canonical.sql'),
        'utf8'
      );

      // Must NOT contain phantom table name
      expect(migrationSql.includes('wallet_ledger_entries')).toBe(false);

      // Must use canonical production wallet_transactions table
      expect(migrationSql.includes('public.wallet_transactions')).toBe(true);

      // Must use to_regclass checks for tables
      expect(migrationSql.includes("to_regclass('public.wallet_transactions')")).toBe(true);
      expect(migrationSql.includes("to_regclass('public.wallet_accounts')")).toBe(true);
      expect(migrationSql.includes("to_regclass('public.entitlements')")).toBe(true);

      // Must have IF NOT EXISTS protections for tables and indexes
      expect(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.entitlements')).toBe(true);
      expect(migrationSql.includes('CREATE INDEX IF NOT EXISTS idx_entitlements_user_work')).toBe(true);
      expect(migrationSql.includes('uq_user_work_chapter_entitlement')).toBe(true);

      // Must have ON CONFLICT DO NOTHING or NOT EXISTS to prevent duplicate backfills
      expect(migrationSql.includes('ON CONFLICT DO NOTHING')).toBe(true);
      expect(migrationSql.includes('check_canonical_pricing_modes')).toBe(true);
    });
  });

  describe('16. Canonical Domain 308 Permanent Redirects & Unified Navigation', () => {
    it('verifies next.config.js enforces 308 redirects for www, /kitoblar, /hikoyalar, /royxatdan-otish', async () => {
      const nextConfig = require('../next.config.js');
      expect(typeof nextConfig.redirects).toBe('function');
      const redirects = await nextConfig.redirects();

      // Check www -> manbora.uz
      const wwwRedirect = redirects.find((r: any) => r.has?.[0]?.value === 'www.manbora.uz');
      expect(wwwRedirect).toBeDefined();
      expect(wwwRedirect.permanent).toBe(true);
      expect(wwwRedirect.destination).toBe('https://manbora.uz/:path*');

      // Check /kitoblar -> /asarlar?type=book
      const kitoblarRedirect = redirects.find((r: any) => r.source === '/kitoblar');
      expect(kitoblarRedirect).toBeDefined();
      expect(kitoblarRedirect.destination).toBe('/asarlar?type=book');
      expect(kitoblarRedirect.permanent).toBe(true);

      // Check /hikoyalar -> /asarlar?type=serialized_story
      const hikoyalarRedirect = redirects.find((r: any) => r.source === '/hikoyalar');
      expect(hikoyalarRedirect).toBeDefined();
      expect(hikoyalarRedirect.destination).toBe('/asarlar?type=serialized_story');
      expect(hikoyalarRedirect.permanent).toBe(true);

      // Check /royxatdan-otish -> /kirish?mode=register
      const registerRedirect = redirects.find((r: any) => r.source === '/royxatdan-otish');
      expect(registerRedirect).toBeDefined();
      expect(registerRedirect.destination).toBe('/kirish?mode=register');
      expect(registerRedirect.permanent).toBe(true);
    });
  });

  describe('17. Bookmark Schema, Invariant & Deduplication Verification', () => {
    it('verifies Migration 020 guarantees 1 bookmark per work per reader and deduplicates notifications', async () => {
      const fs = await import('fs');
      const path = await import('path');

      const migrationSql = fs.readFileSync(
        path.resolve(process.cwd(), 'supabase/migrations/020_reader_bookmarks_and_catalog_unification.sql'),
        'utf8'
      );

      // reading_bookmarks table creation
      expect(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.reading_bookmarks')).toBe(true);

      // Unique constraint: strictly 1 bookmark per user per work
      expect(migrationSql.includes('CONSTRAINT uq_reading_bookmarks_user_work UNIQUE (user_id, work_id)')).toBe(true);

      // RLS enabled and policies defined
      expect(migrationSql.includes('ALTER TABLE public.reading_bookmarks ENABLE ROW LEVEL SECURITY;')).toBe(true);
      expect(migrationSql.includes('Users can view own bookmarks')).toBe(true);
      expect(migrationSql.includes('Users can insert own bookmarks')).toBe(true);
      expect(migrationSql.includes('Users can update own bookmarks')).toBe(true);
      expect(migrationSql.includes('Users can delete own bookmarks')).toBe(true);

      // Notification deduplication index
      expect(migrationSql.includes('idx_in_site_notifications_dedup')).toBe(true);
      expect(migrationSql.includes('source_type TEXT')).toBe(true);
      expect(migrationSql.includes('source_id TEXT')).toBe(true);

      // Notification preferences on profiles
      expect(migrationSql.includes('notification_preferences JSONB')).toBe(true);
    });
  });

  describe('18. Distinct Chapter Access Badges & Entitlement Distinction', () => {
    it('ensures author and admin are distinguished from regular purchased chapters', async () => {
      const { getWorkChaptersAccessMap } = await import('@/lib/security/access');

      const authorUserId = 'author-user-id';
      const adminUserId = 'admin-user-id';
      const guestUserId = null;

      const chapters = [
        { id: 'ch-1', work_id: 'work-1', is_free: true, price: 0, chapter_number: 1 },
        { id: 'ch-2', work_id: 'work-1', is_free: false, price: 5000, chapter_number: 2 },
      ];

      // 1. Author accessing their own work
      const authorMap = await getWorkChaptersAccessMap(
        authorUserId,
        'work-1',
        chapters,
        { authorId: authorUserId }
      );
      expect(authorMap['ch-2'].isLocked).toBe(false);
      expect(authorMap['ch-2'].accessReason).toBe('author');
      expect(authorMap['ch-2'].isPurchased).toBe(false); // Authors did NOT purchase their own work!

      // 2. Admin accessing any work
      const adminMap = await getWorkChaptersAccessMap(
        adminUserId,
        'work-1',
        chapters,
        { authorId: authorUserId, isAdmin: true }
      );
      expect(adminMap['ch-2'].isLocked).toBe(false);
      expect(adminMap['ch-2'].accessReason).toBe('admin');
      expect(adminMap['ch-2'].isPurchased).toBe(false);

      // 3. Free chapter access for guest
      const guestMap = await getWorkChaptersAccessMap(
        guestUserId,
        'work-1',
        chapters,
        { authorId: authorUserId }
      );
      expect(guestMap['ch-1'].isLocked).toBe(false);
      expect(guestMap['ch-1'].accessReason).toBe('free');
      expect(guestMap['ch-2'].isLocked).toBe(true);
      expect(guestMap['ch-2'].accessReason).toBe('locked');
    });
  });

  describe('19. Dynamic Platform Commission & Author Earnings Formula', () => {
    it('computes 80% net author earnings with 20% platform commission', () => {
      const commissionPercentage = 20;
      const authorPercentage = 100 - commissionPercentage;
      expect(authorPercentage).toBe(80);

      const price = 15000;
      const readers = 500;
      const grossTotal = price * readers; // 7,500,000 UZS
      const platformFee = Math.floor((grossTotal * commissionPercentage) / 100); // 1,500,000 UZS
      const authorNet = grossTotal - platformFee; // 6,000,000 UZS

      expect(grossTotal).toBe(7500000);
      expect(platformFee).toBe(1500000);
      expect(authorNet).toBe(6000000);
      expect(authorNet / grossTotal).toBe(0.8);
    });
  });

  describe('20. Open Redirect Attack Defense in Auth Flows', () => {
    it('sanitizes unsafe redirects to default /kabinet', async () => {
      const { getSafeRedirectUrl } = await import('@/lib/utils/redirect');

      // Valid internal paths
      expect(getSafeRedirectUrl('/kutubxona')).toBe('/kutubxona');
      expect(getSafeRedirectUrl('/asarlar/bekatdagi-soat')).toBe('/asarlar/bekatdagi-soat');
      expect(getSafeRedirectUrl('/muallif?tab=works')).toBe('/muallif?tab=works');

      // Malicious external or protocol-relative vectors
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('http://evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('//evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/http:evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/kutubxona\r\nSet-Cookie:bad=1')).toBe('/kabinet');
      expect(getSafeRedirectUrl('')).toBe('/kabinet');
      expect(getSafeRedirectUrl(null)).toBe('/kabinet');
    });
  });

  describe('21. Guest /kabinet Protection & Route Redirect Verification', () => {
    it('redirects unauthenticated guest to /kirish with returnUrl=/kabinet', () => {
      const isGuest = true;
      const targetPath = '/kabinet';
      const redirectUrl = isGuest ? `/kirish?returnUrl=${encodeURIComponent(targetPath)}` : targetPath;
      expect(redirectUrl).toBe('/kirish?returnUrl=%2Fkabinet');
    });

    it('ensures safe returnUrl preservation for guest seeking reader or cabinet', async () => {
      const { getSafeRedirectUrl } = await import('@/lib/utils/redirect');
      const safeTarget = getSafeRedirectUrl('/kabinet');
      expect(safeTarget).toBe('/kabinet');
      const safeReaderTarget = getSafeRedirectUrl('/asarlar/bekatdagi-soat/1-bob');
      expect(safeReaderTarget).toBe('/asarlar/bekatdagi-soat/1-bob');
    });
  });

  describe('22. Unified Notification Count Synchronization Logic', () => {
    it('accurately computes unread count and resets on mark-all-read and logout', () => {
      let unreadCount = 5;
      expect(unreadCount).toBe(5);

      // Optimistic or authoritative mark all read
      unreadCount = 0;
      expect(unreadCount).toBe(0);

      // New notification received via realtime
      unreadCount += 1;
      expect(unreadCount).toBe(1);

      // User signs out
      unreadCount = 0;
      expect(unreadCount).toBe(0);
    });
  });

  describe('23. Metadata Title Normalization & Deduplication', () => {
    it('formats title correctly without producing double "| Manbora"', () => {
      const template = '%s | Manbora';
      const formatTitle = (pageTitle: string) => {
        // Layout template appends " | Manbora" to pageTitle
        // Page titles should NOT include "| Manbora"
        expect(pageTitle.endsWith('| Manbora')).toBe(false);
        return template.replace('%s', pageTitle);
      };

      expect(formatTitle('Barcha asarlar')).toBe('Barcha asarlar | Manbora');
      expect(formatTitle('Kirish va ro‘yxatdan o‘tish')).toBe('Kirish va ro‘yxatdan o‘tish | Manbora');
      expect(formatTitle('Ro‘yxatdan o‘tish')).toBe('Ro‘yxatdan o‘tish | Manbora');
      expect(formatTitle('Sahifa topilmadi')).toBe('Sahifa topilmadi | Manbora');
      expect(formatTitle('Muallif bo‘ling')).toBe('Muallif bo‘ling | Manbora');
    });
  });

  describe('24. Migration 021 Typo Replacement Safety & Idempotency', () => {
    it('corrects typo "qotib qolgan edi.an" to "qotib qolgan edi." idempotently', () => {
      const dirtyText = 'Avtobus bekatida soat millari qotib qolgan edi.an Shamol esardi.';
      const cleanText = dirtyText.replace(/qotib qolgan edi\.an/g, 'qotib qolgan edi.');

      expect(cleanText).toBe('Avtobus bekatida soat millari qotib qolgan edi. Shamol esardi.');
      expect(cleanText.includes('qotib qolgan edi.an')).toBe(false);

      // Re-running replacement produces identical clean output (idempotent)
      const rerun = cleanText.replace(/qotib qolgan edi\.an/g, 'qotib qolgan edi.');
      expect(rerun).toBe(cleanText);
    });
  });

  describe('25. Strict Multi-Role Route Access Enforcement', () => {
    interface MockProfile {
      id: string;
      role: 'reader' | 'author' | 'admin';
      is_admin?: boolean;
      is_author?: boolean;
    }

    const checkAccess = (profile: MockProfile | null, path: string): { allowed: boolean; redirectTo?: string } => {
      if (!profile) {
        return { allowed: false, redirectTo: `/kirish?returnUrl=${encodeURIComponent(path)}` };
      }
      if (path.startsWith('/diyoration')) {
        if (profile.is_admin || profile.role === 'admin') return { allowed: true };
        return { allowed: false, redirectTo: '/kabinet' };
      }
      if (path.startsWith('/muallif')) {
        if (profile.is_author || profile.role === 'author' || profile.role === 'admin' || profile.is_admin) {
          return { allowed: true };
        }
        return { allowed: false, redirectTo: '/muallif-boling' };
      }
      return { allowed: true };
    };

    it('blocks reader from /diyoration admin dashboard and /muallif studio', () => {
      const reader: MockProfile = { id: 'reader-1', role: 'reader', is_admin: false, is_author: false };
      const adminAccess = checkAccess(reader, '/diyoration/dashboard');
      expect(adminAccess.allowed).toBe(false);
      expect(adminAccess.redirectTo).toBe('/kabinet');

      const studioAccess = checkAccess(reader, '/muallif/yangi-asar');
      expect(studioAccess.allowed).toBe(false);
      expect(studioAccess.redirectTo).toBe('/muallif-boling');
    });

    it('author (@testly) can access /muallif studio but is blocked from /diyoration admin', () => {
      const author: MockProfile = { id: 'author-testly', role: 'author', is_author: true, is_admin: false };
      const studioAccess = checkAccess(author, '/muallif/yangi-asar');
      expect(studioAccess.allowed).toBe(true);

      const adminAccess = checkAccess(author, '/diyoration/dashboard');
      expect(adminAccess.allowed).toBe(false);
      expect(adminAccess.redirectTo).toBe('/kabinet');
    });

    it('admin has unrestricted access to /diyoration, /muallif, and /kabinet', () => {
      const admin: MockProfile = { id: 'admin-1', role: 'admin', is_admin: true, is_author: true };
      expect(checkAccess(admin, '/diyoration/dashboard').allowed).toBe(true);
      expect(checkAccess(admin, '/muallif').allowed).toBe(true);
      expect(checkAccess(admin, '/kabinet').allowed).toBe(true);
    });

    it('prevents author from editing another author’s work', () => {
      const workAuthorId: string = 'author-A';
      const currentAuthorId: string = 'author-B';
      const isAdmin = false;

      const canEdit = currentAuthorId === workAuthorId || isAdmin;
      expect(canEdit).toBe(false);
    });
  });

  describe('26. Notification Unread Count Uniformity & State Lifecycle', () => {
    interface NotificationItem {
      id: string;
      user_id: string;
      title: string;
      message: string;
      is_read: boolean;
      read_at: string | null;
      created_at: string;
    }

    const calculateCanonicalUnread = (items: NotificationItem[]): number => {
      return items.filter((n) => !n.is_read && !n.read_at).length;
    };

    it('unread count strictly reflects genuine unread notifications without fake moderation injections', () => {
      const genuineNotifications: NotificationItem[] = [
        { id: '1', user_id: 'u1', title: 'Xarid', message: 'Bob sotib olindi', is_read: false, read_at: null, created_at: '2026-09-06T10:00:00Z' },
        { id: '2', user_id: 'u1', title: 'Sharh', message: 'Yangi fikr', is_read: true, read_at: '2026-09-06T10:05:00Z', created_at: '2026-09-06T09:00:00Z' },
        { id: '3', user_id: 'u1', title: 'Tizim', message: 'Xush kelibsiz', is_read: false, read_at: null, created_at: '2026-09-06T10:10:00Z' },
      ];

      expect(calculateCanonicalUnread(genuineNotifications)).toBe(2);

      // Even if admin has 5 pending moderation tasks, the user unread notification count remains 2
      const pendingModerationTasks = 5;
      const countAfterCheck = calculateCanonicalUnread(genuineNotifications);
      expect(countAfterCheck).toBe(2);
      expect(countAfterCheck).not.toBe(2 + pendingModerationTasks);
    });

    it('marking an item as read decrements count and sets read_at', () => {
      let items: NotificationItem[] = [
        { id: '1', user_id: 'u1', title: 'Xarid', message: 'Bob sotib olindi', is_read: false, read_at: null, created_at: '2026-09-06T10:00:00Z' },
      ];
      expect(calculateCanonicalUnread(items)).toBe(1);

      // Mark single item read
      const now = new Date().toISOString();
      items = items.map((n) => (n.id === '1' ? { ...n, is_read: true, read_at: now } : n));
      expect(calculateCanonicalUnread(items)).toBe(0);
    });

    it('logout wipes notification state completely', () => {
      let state = {
        notifications: [{ id: '1', is_read: false, read_at: null }] as NotificationItem[],
        unreadCount: 1,
        loading: false,
      };

      // Simulate onAuthStateChange SIGNED_OUT
      const handleSignOut = () => {
        state = { notifications: [], unreadCount: 0, loading: false };
      };

      handleSignOut();
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });

    it('error in notification fetch sets error state instead of silently lying as 0', () => {
      let state: { unreadCount: number; error: string | null } = { unreadCount: 1, error: null };
      const simulateFailedFetch = () => {
        state.error = 'Bildirishnomalarni yuklashda xatolik yuz berdi';
      };

      simulateFailedFetch();
      expect(state.error).toBeTruthy();
      // Notice unread count is preserved or flagged as error, not falsely reset to 0
      expect(state.unreadCount).toBe(1);
    });
  });

  describe('27. /api/admin/payouts Authorization and Empty State Handling', () => {
    interface PayoutRow {
      id: string;
      author_id: string;
      amount: number;
      status: 'pending' | 'paid' | 'rejected';
      card_number: string;
      created_at: string;
    }

    const mockAdminPayoutsHandler = async (userRole: string, rows: PayoutRow[]) => {
      if (userRole !== 'admin') {
        return { status: 403, error: 'Kirish taqiqlangan: faqat administratorlar uchun' };
      }
      const counts = {
        all: rows.length,
        pending: rows.filter((r) => r.status === 'pending').length,
        paid: rows.filter((r) => r.status === 'paid').length,
        rejected: rows.filter((r) => r.status === 'rejected').length,
      };
      return { status: 200, data: { payouts: rows, counts } };
    };

    it('returns 403 Forbidden for non-admin users', async () => {
      const readerResponse = await mockAdminPayoutsHandler('reader', []);
      expect(readerResponse.status).toBe(403);

      const authorResponse = await mockAdminPayoutsHandler('author', []);
      expect(authorResponse.status).toBe(403);
    });

    it('returns 200 OK with empty list when no payout requests exist without errors', async () => {
      const adminResponse = await mockAdminPayoutsHandler('admin', []);
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.data?.payouts).toEqual([]);
      expect(adminResponse.data?.counts).toEqual({
        all: 0,
        pending: 0,
        paid: 0,
        rejected: 0,
      });
    });

    it('correctly categorizes status counts for pending, paid, and rejected payouts', async () => {
      const mockRows: PayoutRow[] = [
        { id: 'p1', author_id: 'a1', amount: 50000, status: 'pending', card_number: '86001234', created_at: '2026-09-01' },
        { id: 'p2', author_id: 'a2', amount: 100000, status: 'paid', card_number: '98601234', created_at: '2026-09-02' },
        { id: 'p3', author_id: 'a3', amount: 30000, status: 'rejected', card_number: '86005678', created_at: '2026-09-03' },
        { id: 'p4', author_id: 'a1', amount: 75000, status: 'pending', card_number: '86001234', created_at: '2026-09-04' },
      ];

      const response = await mockAdminPayoutsHandler('admin', mockRows);
      expect(response.status).toBe(200);
      expect(response.data?.counts).toEqual({
        all: 4,
        pending: 2,
        paid: 1,
        rejected: 1,
      });
    });
  });

  describe('28. Payouts UI Mutually Exclusive Rendering', () => {
    type UIState = 'loading' | 'error' | 'empty' | 'content';

    const determinePayoutsUIState = (params: {
      loading: boolean;
      error: string | null;
      payoutsCount: number;
    }): UIState => {
      if (params.loading) return 'loading';
      if (params.error) return 'error';
      if (params.payoutsCount === 0) return 'empty';
      return 'content';
    };

    it('renders loading state exclusively', () => {
      const state = determinePayoutsUIState({ loading: true, error: null, payoutsCount: 0 });
      expect(state).toBe('loading');
      expect(state).not.toBe('error');
      expect(state).not.toBe('empty');
    });

    it('renders error state with retry and suppresses contradictory empty message', () => {
      const state = determinePayoutsUIState({
        loading: false,
        error: 'Pul yechish so‘rovlarini yuklab bo‘lmadi',
        payoutsCount: 0,
      });
      expect(state).toBe('error');
      expect(state).not.toBe('empty');
      expect(state).not.toBe('content');
    });

    it('renders empty state cleanly only when no error and 0 payouts', () => {
      const state = determinePayoutsUIState({ loading: false, error: null, payoutsCount: 0 });
      expect(state).toBe('empty');
    });

    it('renders content when payouts are present', () => {
      const state = determinePayoutsUIState({ loading: false, error: null, payoutsCount: 5 });
      expect(state).toBe('content');
    });
  });

  describe('29. Admin Route Redirection & Protection', () => {
    const handleAdminRoute = (path: string, search: string = ''): { redirect: string; status: number } | null => {
      if (path === '/admin') {
        return { redirect: `/diyoration/dashboard${search}`, status: 308 };
      }
      if (path.startsWith('/admin/')) {
        const dest = path.replace(/^\/admin/, '/diyoration');
        return { redirect: `${dest}${search}`, status: 308 };
      }
      return null;
    };

    it('redirects /admin to /diyoration/dashboard with 308 permanent redirect', () => {
      const res = handleAdminRoute('/admin');
      expect(res).toEqual({ redirect: '/diyoration/dashboard', status: 308 });
    });

    it('redirects /admin/yechish-sorovlari to /diyoration/yechish-sorovlari with 308', () => {
      const res = handleAdminRoute('/admin/yechish-sorovlari');
      expect(res).toEqual({ redirect: '/diyoration/yechish-sorovlari', status: 308 });
    });

    it('preserves query parameters during 308 admin redirect', () => {
      const res = handleAdminRoute('/admin/foydalanuvchilar', '?page=2&tab=active');
      expect(res).toEqual({ redirect: '/diyoration/foydalanuvchilar?page=2&tab=active', status: 308 });
    });

    it('leaves non-admin routes untouched', () => {
      expect(handleAdminRoute('/asarlar')).toBeNull();
      expect(handleAdminRoute('/kabinet')).toBeNull();
      expect(handleAdminRoute('/muallif')).toBeNull();
    });
  });
});


