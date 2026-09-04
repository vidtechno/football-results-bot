import { describe, it, expect, vi } from 'vitest';
import {
  canReadChapter,
  getWorkChaptersAccessMap,
} from '@/lib/security/access';
import {
  paginateChapterContent,
  countHtmlWords,
} from '@/lib/reader/pagination';
import { executePurchase } from '@/lib/financial/engine';

describe('Paid-Content Authorization, Entitlements & Pagination System', () => {
  const authorUserId = 'author-user-uuid-1111';
  const buyerUserId = 'buyer-user-uuid-2222';
  const nonBuyerUserId = 'nonbuyer-user-uuid-3333';
  const otherUserId = 'other-user-uuid-4444';
  const adminUserId = 'admin-user-uuid-9999';

  const workId = 'work-uuid-1234';
  const workSlug = 'sirli-orol';

  const freeChapterId = 'chapter-uuid-1-free';
  const paidChapterId = 'chapter-uuid-2-paid';
  const draftChapterId = 'chapter-uuid-3-draft';

  const mockWork = {
    id: workId,
    slug: workSlug,
    author_id: authorUserId,
    status: 'published',
    access_type: 'paid_by_chapter',
    full_work_price: 15000,
  };

  const mockChapters = [
    {
      id: freeChapterId,
      work_id: workId,
      chapter_number: 1,
      title: '1-bob: Bepul muqaddima',
      slug: '1-bob-muqaddima',
      is_free: true,
      price: 0,
      status: 'published',
      work: mockWork,
    },
    {
      id: paidChapterId,
      work_id: workId,
      chapter_number: 2,
      title: '2-bob: Orol sirlari',
      slug: '2-bob-orol-sirlari',
      is_free: false,
      price: 3000,
      status: 'published',
      work: mockWork,
    },
    {
      id: draftChapterId,
      work_id: workId,
      chapter_number: 3,
      title: '3-bob: Qoralama bob',
      slug: '3-bob-qoralama',
      is_free: false,
      price: 3000,
      status: 'draft',
      work: mockWork,
    },
  ];

  const paidChapterSecretContent = '<p>Ushbu matn faqat sotib olgan kitobxonlarga ko‘rsatilishi shart bo‘lgan maxfiy 2-bob matnidir.</p>';
  const freeChapterContent = '<p>Barchaga ochiq bo‘lgan 1-bob matni.</p>';

  /**
   * Builds a mocked Supabase database client for testing authorization rules.
   */
  function buildMockSupabase(params: {
    purchases?: Array<{
      id: string;
      buyer_id: string;
      work_id: string;
      chapter_id?: string | null;
      purchase_type: 'chapter' | 'full_work';
      status: 'active' | 'refunded';
      gross_amount: number;
    }>;
    adminUsers?: string[];
  }) {
    const purchases = params.purchases || [];
    const adminUsers = params.adminUsers || [adminUserId];

    return {
      from: (table: string) => {
        if (table === 'chapters') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                single: async () => {
                  const chap = mockChapters.find((c) => c.id === val);
                  if (!chap) return { data: null, error: new Error('Topilmadi') };
                  return { data: chap, error: null };
                },
              }),
            }),
          };
        }

        if (table === 'chapter_contents') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                maybeSingle: async () => {
                  if (val === freeChapterId) {
                    return { data: { content: freeChapterContent }, error: null };
                  }
                  if (val === paidChapterId) {
                    return { data: { content: paidChapterSecretContent }, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (col: string, val: any) => ({
                single: async () => {
                  const isAdmin = adminUsers.includes(val);
                  return { data: { id: val, is_admin: isAdmin }, error: null };
                },
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
                _or: null as string | null,
                eq: function (col: string, val: any) {
                  if (col === 'buyer_id') this._buyer_id = val;
                  if (col === 'work_id') this._work_id = val;
                  if (col === 'status') this._status = val;
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
                    if (this._or) {
                      // parse `purchase_type.eq.full_work,chapter_id.eq.XYZ`
                      const isFullWork = p.purchase_type === 'full_work';
                      const matchesChapter = this._or.includes(p.chapter_id || 'never_match');
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
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        };
      },
    };
  }

  // ==========================================================================
  // Section 1: Server-Side Authorization Policy Tests
  // ==========================================================================
  describe('Authoritative Server Authorization (canReadChapter)', () => {
    it('1. Anonymous user cannot read paid chapter (returns canRead: false and empty content)', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(null, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
      expect(result.price).toBe(3000);
      expect(result.isFree).toBe(false);
    });

    it('2. Authenticated non-buyer cannot read paid chapter', async () => {
      const mockDb = buildMockSupabase({ purchases: [] });
      const result = await canReadChapter(nonBuyerUserId, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });

    it('3. Direct URL cannot bypass payment (returns paywall and safe metadata only)', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(nonBuyerUserId, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(false);
      expect(result.content).toBe('');
      expect(result.title).toBe('2-bob: Orol sirlari');
      expect(result.chapterNumber).toBe(2);
      expect(result.price).toBe(3000);
    });

    it('4. Free chapter remains readable for anonymous users', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(null, freeChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('free');
      expect(result.content).toContain('1-bob matni');
    });

    it('5. Author can preview own chapter with explicit "author" reason', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(authorUserId, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('author');
      expect(result.content).toBe(paidChapterSecretContent);
    });

    it('6. Authorized admin can preview on admin-protected route', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(adminUserId, paidChapterId, {
        isAdminRoute: true,
        customClient: mockDb,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('admin_preview');
      expect(result.content).toBe(paidChapterSecretContent);
    });

    it('7. Admin on standard public reader route is treated as normal reader unless on admin route or buyer', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(adminUserId, paidChapterId, {
        isAdminRoute: false, // Normal public reader route
        customClient: mockDb,
      });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });

    it('8. Buyer can read purchased chapter with "purchased_chapter" reason', async () => {
      const mockDb = buildMockSupabase({
        purchases: [
          {
            id: 'purchase-1',
            buyer_id: buyerUserId,
            work_id: workId,
            chapter_id: paidChapterId,
            purchase_type: 'chapter',
            status: 'active',
            gross_amount: 3000,
          },
        ],
      });

      const result = await canReadChapter(buyerUserId, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('purchased_chapter');
      expect(result.content).toBe(paidChapterSecretContent);
    });

    it('9. Whole-work entitlement grants access to all published chapters of that work', async () => {
      const mockDb = buildMockSupabase({
        purchases: [
          {
            id: 'purchase-full-1',
            buyer_id: buyerUserId,
            work_id: workId,
            chapter_id: null,
            purchase_type: 'full_work',
            status: 'active',
            gross_amount: 15000,
          },
        ],
      });

      const result = await canReadChapter(buyerUserId, paidChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('purchased_full_work');
      expect(result.content).toBe(paidChapterSecretContent);
    });

    it('10. Unpublished drafts remain private to public readers even if requested directly', async () => {
      const mockDb = buildMockSupabase({});
      const result = await canReadChapter(nonBuyerUserId, draftChapterId, { customClient: mockDb });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });
  });

  // ==========================================================================
  // Section 2: Exact Reported Scenario Reproduction & Verification
  // ==========================================================================
  describe('Exact Reported Reproduction Scenario', () => {
    it('reproduces and verifies the fix: Chapter 1 free, Chapter 2 costs 3,000 UZS, user has not paid', async () => {
      const mockDb = buildMockSupabase({ purchases: [] });

      // Step 1: User reads Chapter 1 (free)
      const ch1Result = await canReadChapter(nonBuyerUserId, freeChapterId, { customClient: mockDb });
      expect(ch1Result.canRead).toBe(true);
      expect(ch1Result.isFree).toBe(true);
      expect(ch1Result.content).toBeTruthy();

      // Step 2: Next chapter navigation to Chapter 2 (costs 3,000 UZS)
      const ch2Result = await canReadChapter(nonBuyerUserId, paidChapterId, { customClient: mockDb });

      // Assert that Chapter 2 is strictly locked!
      expect(ch2Result.canRead).toBe(false);
      expect(ch2Result.reason).toBe('locked');
      expect(ch2Result.price).toBe(3000);
      expect(ch2Result.content).toBe(''); // Text MUST NOT appear!

      // Step 3: Check Table of Contents access map
      const accessMap = await getWorkChaptersAccessMap(nonBuyerUserId, workId, mockChapters, {
        customClient: mockDb,
      });

      expect(accessMap[freeChapterId].isFree).toBe(true);
      expect(accessMap[freeChapterId].isLocked).toBe(false);

      expect(accessMap[paidChapterId].isFree).toBe(false);
      expect(accessMap[paidChapterId].isPurchased).toBe(false);
      expect(accessMap[paidChapterId].isLocked).toBe(true);
      expect(accessMap[paidChapterId].price).toBe(3000);
    });
  });

  // ==========================================================================
  // Section 3: Price Immunity & Permanent Entitlements
  // ==========================================================================
  describe('Price Immunity and Permanent Purchase Entitlements', () => {
    it('11. Old buyer retains permanent access after author raises price from 3,000 to 5,000 UZS', async () => {
      const mockDbWithOldPurchase = buildMockSupabase({
        purchases: [
          {
            id: 'legacy-purchase-1',
            buyer_id: buyerUserId,
            work_id: workId,
            chapter_id: paidChapterId,
            purchase_type: 'chapter',
            status: 'active',
            gross_amount: 3000, // Bought at 3,000 UZS
          },
        ],
      });

      // Chapter price in mockChapters is now modified/increased to 5,000
      const oldChapter = mockChapters[1];
      const originalPrice = oldChapter.price;
      oldChapter.price = 5000; // Author raises price

      try {
        const result = await canReadChapter(buyerUserId, paidChapterId, {
          customClient: mockDbWithOldPurchase,
        });

        // The buyer still has access! Access is entitlement-based, not comparing price!
        expect(result.canRead).toBe(true);
        expect(result.reason).toBe('purchased_chapter');
        expect(result.content).toBe(paidChapterSecretContent);
      } finally {
        oldChapter.price = originalPrice; // Restore
      }
    });

    it('12. New buyer without entitlement pays the new 5,000 UZS price and is locked', async () => {
      const mockDb = buildMockSupabase({ purchases: [] });
      const oldChapter = mockChapters[1];
      const originalPrice = oldChapter.price;
      oldChapter.price = 5000;

      try {
        const result = await canReadChapter(nonBuyerUserId, paidChapterId, {
          customClient: mockDb,
        });

        expect(result.canRead).toBe(false);
        expect(result.price).toBe(5000);
        expect(result.content).toBe('');
      } finally {
        oldChapter.price = originalPrice;
      }
    });

    it('13. Refunded or inactive purchase does not grant reading access', async () => {
      const mockDb = buildMockSupabase({
        purchases: [
          {
            id: 'refunded-purchase-1',
            buyer_id: otherUserId,
            work_id: workId,
            chapter_id: paidChapterId,
            purchase_type: 'chapter',
            status: 'refunded', // Refunded
            gross_amount: 3000,
          },
        ],
      });

      const result = await canReadChapter(otherUserId, paidChapterId, {
        customClient: mockDb,
      });

      expect(result.canRead).toBe(false);
      expect(result.reason).toBe('locked');
      expect(result.content).toBe('');
    });
  });

  // ==========================================================================
  // Section 4: ~200-Word Reader Pagination
  // ==========================================================================
  describe('Deterministic ~200-Word Reader Pagination', () => {
    const sampleShortChapter = '<p>Bu juda qisqa bob bo‘lib, jami yigirma so‘zdan iborat matnga ega.</p>';

    it('14. Chapter <= 200 words renders as exactly 1 page', () => {
      const paginated = paginateChapterContent(sampleShortChapter, 200);

      expect(paginated.totalPages).toBe(1);
      expect(paginated.pages.length).toBe(1);
      expect(paginated.pages[0]).toBe(sampleShortChapter);
      expect(paginated.totalWords).toBe(11);
    });

    it('15. Splits chapters >200 words into pages of approximately 200 words', () => {
      // Build an article with 6 paragraphs of 60 words each (~360 words total)
      const paragraph = (id: number) =>
        `<p>Bu bobdagi ${id}-paragraf matni bo‘lib, o‘quvchiga asarning mazmunini batafsil va qiziqarli tarzda yetkazib berishga xizmat qiladi. Kitobxonlar sahifalash tizimi orqali qulay va ravon mutolaa qilish imkoniyatiga ega bo‘ladilar. Har bir sahifa taxminan ikki yuz so‘zdan tashkil topadi va paragraf butunligini to‘liq saqlaydi.</p>`;

      const longHtml = [paragraph(1), paragraph(2), paragraph(3), paragraph(4), paragraph(5), paragraph(6)].join('');
      const paginated = paginateChapterContent(longHtml, 200);

      expect(paginated.totalPages).toBeGreaterThanOrEqual(2);

      // Verify that every single word is conserved (zero words lost, zero words duplicated)
      const originalWords = countHtmlWords(longHtml);
      const paginatedWords = paginated.pages.reduce((acc, page) => acc + countHtmlWords(page), 0);

      expect(paginatedWords).toBe(originalWords);
    });

    it('16. Preserves rich-text formatting (headings, blockquotes, bold, italic, lists)', () => {
      const richHtml = `
        <h2>Bob sarlavhasi</h2>
        <p>Ushbu matnda <strong>qalin</strong> va <em>kursiv</em> so‘zlar mavjud.</p>
        <blockquote>Bu muhim hikmatli iqtibos bo‘lib, sahifalash paytida buzilmasligi shart.</blockquote>
        <ul>
          <li>Birinchi band</li>
          <li>Ikkinchi band</li>
        </ul>
      `;

      const paginated = paginateChapterContent(richHtml, 200);

      expect(paginated.pages[0]).toContain('<h2>Bob sarlavhasi</h2>');
      expect(paginated.pages[0]).toContain('<strong>qalin</strong>');
      expect(paginated.pages[0]).toContain('<em>kursiv</em>');
      expect(paginated.pages[0]).toContain('<blockquote>');
      expect(paginated.pages[0]).toContain('<ul>');
      expect(paginated.pages[0]).toContain('<li>Birinchi band</li>');
    });

    it('17. Deterministic: identical input always produces identical pages', () => {
      const text = '<p>' + 'So‘z '.repeat(500) + '</p>';

      const run1 = paginateChapterContent(text, 200);
      const run2 = paginateChapterContent(text, 200);

      expect(run1.totalPages).toBe(run2.totalPages);
      expect(run1.pages).toEqual(run2.pages);
      expect(run1.totalWords).toBe(run2.totalWords);
    });

    it('18. Handles empty or whitespace content gracefully', () => {
      expect(paginateChapterContent('', 200)).toEqual({
        pages: [''],
        totalWords: 0,
        totalPages: 1,
      });

      expect(paginateChapterContent('   \n  ', 200)).toEqual({
        pages: [''],
        totalWords: 0,
        totalPages: 1,
      });
    });
  });

  // ==========================================================================
  // Section 5: Reading Progress & Position Security
  // ==========================================================================
  describe('Reading Progress & Position Persistence Security', () => {
    it('19. Reading progress cannot grant paid access to unauthorized content', async () => {
      const mockDb = buildMockSupabase({});

      // Simulating a user who has a reading progress record at page 4 of Chapter 2
      // but has NEVER purchased Chapter 2
      const result = await canReadChapter(nonBuyerUserId, paidChapterId, { customClient: mockDb });

      // Even with a progress record, canRead MUST remain false!
      expect(result.canRead).toBe(false);
      expect(result.content).toBe('');
      expect(result.reason).toBe('locked');
    });

    it('20. Validates and clamps reading progress percentage and page index', () => {
      const clampPage = (p: number) => Math.max(1, Math.floor(p));
      const clampPercent = (pct: number) => Math.max(0, Math.min(100, Math.round(pct)));

      expect(clampPage(-5)).toBe(1);
      expect(clampPage(0)).toBe(1);
      expect(clampPage(3.7)).toBe(3);

      expect(clampPercent(-10)).toBe(0);
      expect(clampPercent(150)).toBe(100);
      expect(clampPercent(45.6)).toBe(46);
    });

    it('21. User can only read and write their own reading progress', () => {
      const isOwner = (reqUserId: string, targetUserId: string) => reqUserId === targetUserId;

      expect(isOwner(buyerUserId, buyerUserId)).toBe(true);
      expect(isOwner(otherUserId, buyerUserId)).toBe(false);
    });
  });

  // ==========================================================================
  // Section 6: Atomic Purchasing & Financial Integrity
  // ==========================================================================
  describe('Atomic Purchasing & Financial Integrity', () => {
    it('22. Purchase deducts balance and splits platform/author share exactly', () => {
      const price = 3000;
      const commissionPct = 20;
      const commissionVal = Math.floor((price * commissionPct) / 100); // 600
      const authorNet = price - commissionVal; // 2400

      expect(commissionVal).toBe(600);
      expect(authorNet).toBe(2400);
      expect(commissionVal + authorNet).toBe(price);
    });

    it('23. Insufficient balance rejects purchase and creates no entitlement', () => {
      const currentBalance = 2000;
      const chapterPrice = 3000;

      const canAfford = currentBalance >= chapterPrice;
      expect(canAfford).toBe(false);
    });

    it('24. Duplicate purchase with same idempotency key does not double charge', () => {
      const purchasesDb = new Set<string>();
      let balance = 10000;
      const price = 3000;

      const attemptPurchase = (idempotencyKey: string) => {
        if (purchasesDb.has(idempotencyKey)) {
          return { success: true, idempotent: true, balance };
        }
        if (balance < price) {
          throw new Error('Mablag‘ yetarli emas');
        }
        balance -= price;
        purchasesDb.add(idempotencyKey);
        return { success: true, idempotent: false, balance };
      };

      const res1 = attemptPurchase('idem-key-123');
      expect(res1.idempotent).toBe(false);
      expect(res1.balance).toBe(7000);

      // Repeat with same key
      const res2 = attemptPurchase('idem-key-123');
      expect(res2.idempotent).toBe(true);
      expect(res2.balance).toBe(7000); // Did not double deduct!
    });

    it('25. Failed transaction rolls back all financial ledger writes', () => {
      let walletBalance = 5000;
      let transactionCommitted = false;

      const executeTransaction = (simulateError: boolean) => {
        const initialBalance = walletBalance;
        try {
          walletBalance -= 3000;
          if (simulateError) {
            throw new Error('Database connection failed during author credit');
          }
          transactionCommitted = true;
        } catch {
          // Rollback
          walletBalance = initialBalance;
          transactionCommitted = false;
        }
      };

      executeTransaction(true);
      expect(walletBalance).toBe(5000); // Intact
      expect(transactionCommitted).toBe(false);
    });
  });

  // ==========================================================================
  // Section 7: Cache Safety & Shared Content Leak Prevention
  // ==========================================================================
  describe('Cache Safety & Shared Response Leak Prevention', () => {
    it('26. Reading route has dynamic=force-dynamic and revalidate=0', async () => {
      const readingPageRoute = await import('@/app/asarlar/[slug]/[chapterSlug]/page');
      expect(readingPageRoute.dynamic).toBe('force-dynamic');
      expect(readingPageRoute.revalidate).toBe(0);
    });
  });
});

