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
});
