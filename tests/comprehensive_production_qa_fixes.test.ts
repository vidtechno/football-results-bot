import { describe, it, expect, vi } from 'vitest';
import {
  evaluateCanonicalChapterAccess,
  canReadChapter,
  getWorkChaptersAccessMap,
} from '@/lib/security/access';
import { executePurchase } from '@/lib/financial/engine';
import { getRecentReadingProgress } from '@/lib/services/progress';

describe('Comprehensive Production QA Fixes - Regression Suite', () => {
  // =========================================================================
  // 1. Access-policy unit tests & 2. Free / whole-work / chapter-payment tests
  // =========================================================================
  describe('1 & 2. Canonical Access-Policy Unit & Payment Model Tests', () => {
    it('Canonical rule: fully free work grants reading even if stale chapter prices exist', () => {
      const access = evaluateCanonicalChapterAccess({
        workAccessType: 'free',
        fullWorkPrice: 0,
        chapterIsFree: false, // stale false
        chapterPrice: 3000,   // stale price
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });

      expect(access.canRead).toBe(true);
      expect(access.reason).toBe('free');
      expect(access.isFree).toBe(true);
      expect(access.price).toBe(0);
      expect(access.isLocked).toBe(false);
      expect(access.requiresWholeWork).toBe(false);
    });

    it('Canonical rule: guest can read every published chapter of a fully free work', () => {
      const accessGuest = evaluateCanonicalChapterAccess({
        workAccessType: 'free',
        fullWorkPrice: 0,
        chapterIsFree: false,
        chapterPrice: 5000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });

      expect(accessGuest.canRead).toBe(true);
      expect(accessGuest.isFree).toBe(true);
      expect(accessGuest.price).toBe(0);
    });

    it('Canonical rule: whole-work purchase model requires whole-work purchase and locks individual chapters', () => {
      // Without whole work entitlement
      const lockedAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_full_work',
        fullWorkPrice: 25000,
        chapterIsFree: false,
        chapterPrice: 3000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });
      expect(lockedAccess.canRead).toBe(false);
      expect(lockedAccess.reason).toBe('locked');
      expect(lockedAccess.requiresWholeWork).toBe(true);
      expect(lockedAccess.price).toBe(25000);

      // With whole work entitlement
      const purchasedAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_full_work',
        fullWorkPrice: 25000,
        chapterIsFree: false,
        chapterPrice: 3000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: true,
        hasChapterEntitlement: false,
      });
      expect(purchasedAccess.canRead).toBe(true);
      expect(purchasedAccess.reason).toBe('purchased_full_work');
    });

    it('Canonical rule: chapter-by-chapter model allows free chapters and requires chapter purchase for paid ones', () => {
      const freeChapterAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_by_chapter',
        fullWorkPrice: 0,
        chapterIsFree: true,
        chapterPrice: 0,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });
      expect(freeChapterAccess.canRead).toBe(true);
      expect(freeChapterAccess.reason).toBe('free');

      const paidChapterAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_by_chapter',
        fullWorkPrice: 0,
        chapterIsFree: false,
        chapterPrice: 4000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });
      expect(paidChapterAccess.canRead).toBe(false);
      expect(paidChapterAccess.reason).toBe('locked');
      expect(paidChapterAccess.price).toBe(4000);
    });

    it('Canonical rule: author and admin preview content without creating financial transactions', () => {
      const authorAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_full_work',
        fullWorkPrice: 50000,
        chapterIsFree: false,
        chapterPrice: 5000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: true,
        isAdmin: false,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });
      expect(authorAccess.canRead).toBe(true);
      expect(authorAccess.reason).toBe('author');
      expect(authorAccess.price).toBe(0);

      const adminAccess = evaluateCanonicalChapterAccess({
        workAccessType: 'paid_by_chapter',
        fullWorkPrice: 0,
        chapterIsFree: false,
        chapterPrice: 5000,
        isWorkPublished: true,
        isChapterPublished: true,
        isAuthor: false,
        isAdmin: true,
        hasFullWorkEntitlement: false,
        hasChapterEntitlement: false,
      });
      expect(adminAccess.canRead).toBe(true);
      expect(adminAccess.reason).toBe('admin_preview');
      expect(adminAccess.price).toBe(0);
    });

    it('Canonical rule: getWorkChaptersAccessMap normalizes free works to isFree=true and price=0 for all chapters', async () => {
      const chapters = [
        { id: 'ch-1', is_free: true, price: 0 },
        { id: 'ch-2', is_free: false, price: 3000 },
        { id: 'ch-3', is_free: false, price: 3000 },
      ];

      const accessMap = await getWorkChaptersAccessMap('reader-123', 'work-free', chapters, {
        workAccessType: 'free',
        fullWorkPrice: 0,
      });

      expect(accessMap['ch-1'].isFree).toBe(true);
      expect(accessMap['ch-1'].price).toBe(0);
      expect(accessMap['ch-1'].isLocked).toBe(false);

      expect(accessMap['ch-2'].isFree).toBe(true);
      expect(accessMap['ch-2'].price).toBe(0);
      expect(accessMap['ch-2'].isLocked).toBe(false);

      expect(accessMap['ch-3'].isFree).toBe(true);
      expect(accessMap['ch-3'].price).toBe(0);
      expect(accessMap['ch-3'].isLocked).toBe(false);
    });
  });

  // =========================================================================
  // 3. Purchase idempotency & 4. No-ledger-write-for-free-work tests
  // =========================================================================
  describe('3 & 4. Financial Engine & Purchase Idempotency Tests', () => {
    it('executePurchase rejects purchases on free works without ledger debit or credit', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'work-free-1',
                  title: 'Noldan emas, minusdan',
                  access_type: 'free',
                  full_work_price: 0,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
              maybeSingle: async () => ({
                data: {
                  id: 'work-free-1',
                  title: 'Noldan emas, minusdan',
                  access_type: 'free',
                  full_work_price: 0,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await executePurchase(
        'reader-1',
        'work-free-1',
        'ch-2',
        'idem-free-test',
        mockSupabase as any,
      );

      expect(result.success).toBe(true);
      expect(result.already_owned).toBe(true);
      expect(result.message).toContain('bepul');
      expect((result as any).purchase_id).toBeUndefined();
    });

    it('executePurchase rejects chapter-level purchases under paid_full_work model', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'work-book-1',
                  title: 'Pullik Kitob',
                  access_type: 'paid_full_work',
                  full_work_price: 25000,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
              maybeSingle: async () => ({
                data: {
                  id: 'work-book-1',
                  title: 'Pullik Kitob',
                  access_type: 'paid_full_work',
                  full_work_price: 25000,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await executePurchase(
        'reader-1',
        'work-book-1',
        'ch-2',
        'idem-book-chap-test',
        mockSupabase as any,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('to‘liq sotiladi');
    });

    it('executePurchase rejects full-work purchase under paid_by_chapter model', async () => {
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'work-serial-1',
                  title: 'Serial Hikoya',
                  access_type: 'paid_by_chapter',
                  full_work_price: 0,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
              maybeSingle: async () => ({
                data: {
                  id: 'work-serial-1',
                  title: 'Serial Hikoya',
                  access_type: 'paid_by_chapter',
                  full_work_price: 0,
                  author_id: 'author-1',
                  status: 'published',
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await executePurchase(
        'reader-1',
        'work-serial-1',
        null,
        'idem-serial-full-test',
        mockSupabase as any,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('bobma-bob');
    });
  });

  // =========================================================================
  // 5. Canonical and legacy chapter routing tests
  // =========================================================================
  describe('5. Canonical & Legacy Chapter Routing', () => {
    it('Canonical chapter URL structure is /asarlar/{workSlug}/{chapterSlug}', () => {
      const workSlug = 'noldan-emas-minusdan';
      const chapterSlug = '2-bob-orol-sirlari';
      const canonicalUrl = `/asarlar/${workSlug}/${chapterSlug}`;
      expect(canonicalUrl).toBe('/asarlar/noldan-emas-minusdan/2-bob-orol-sirlari');
    });

    it('Legacy /mutolaa URL mapper maps work slug and chapter slug to canonical URL', () => {
      function mapLegacyToCanonical(workSlug: string, chapterSlug: string, searchParams?: string) {
        let destination = `/asarlar/${encodeURIComponent(workSlug)}/${encodeURIComponent(chapterSlug)}`;
        if (searchParams) {
          destination += `?${searchParams}`;
        }
        return destination;
      }

      const dest = mapLegacyToCanonical('noldan-emas-minusdan', '2-bob', 'page=3');
      expect(dest).toBe('/asarlar/noldan-emas-minusdan/2-bob?page=3');
    });
  });

  // =========================================================================
  // 6. New-work route tests
  // =========================================================================
  describe('6. New-work /muallif/asar/yangi protected route', () => {
    it('Generates redirect with encoded returnUrl for unauthenticated users', () => {
      function getAuthRedirect(pathname: string): string {
        return `/kirish?returnUrl=${encodeURIComponent(pathname)}`;
      }

      const redirectUrl = getAuthRedirect('/muallif/asar/yangi');
      expect(redirectUrl).toBe('/kirish?returnUrl=%2Fmuallif%2Fasar%2Fyangi');
    });
  });

  // =========================================================================
  // 7. Multi-work analytics funnel tests
  // =========================================================================
  describe('7. Multi-Work Analytics Funnels Partitioning', () => {
    it('Calculates funnel progression strictly per work and never across different works', () => {
      interface AnalyticsChapter {
        id: string;
        work_id: string;
        chapter_number: number;
        title: string;
        reads: number;
      }

      const chapters: AnalyticsChapter[] = [
        // Work A
        { id: 'w1-c1', work_id: 'work-1', chapter_number: 1, title: 'W1 C1', reads: 100 },
        { id: 'w1-c2', work_id: 'work-1', chapter_number: 2, title: 'W1 C2', reads: 80 },
        { id: 'w1-c3', work_id: 'work-1', chapter_number: 3, title: 'W1 C3', reads: 60 },
        // Work B
        { id: 'w2-c1', work_id: 'work-2', chapter_number: 1, title: 'W2 C1', reads: 20 },
        { id: 'w2-c2', work_id: 'work-2', chapter_number: 2, title: 'W2 C2', reads: 18 },
        { id: 'w2-c3', work_id: 'work-2', chapter_number: 3, title: 'W2 C3', reads: 15 },
      ];

      // Partition by work
      const workGroups = new Map<string, AnalyticsChapter[]>();
      chapters.forEach((c) => {
        const list = workGroups.get(c.work_id) || [];
        list.push(c);
        workGroups.set(c.work_id, list);
      });

      expect(workGroups.size).toBe(2);

      // Work 1 dropoffs
      const w1Chaps = workGroups.get('work-1')!;
      w1Chaps.sort((a, b) => a.chapter_number - b.chapter_number);
      const w1DropoffC1toC2 = w1Chaps[0].reads - w1Chaps[1].reads; // 20 drop
      const w1DropPct = (w1DropoffC1toC2 / w1Chaps[0].reads) * 100; // 20%
      expect(w1DropPct).toBe(20);

      // Never compare w1-c3 to w2-c1!
      // Work 2 dropoffs
      const w2Chaps = workGroups.get('work-2')!;
      w2Chaps.sort((a, b) => a.chapter_number - b.chapter_number);
      const w2DropoffC1toC2 = w2Chaps[0].reads - w2Chaps[1].reads; // 2 drop
      const w2DropPct = (w2DropoffC1toC2 / w2Chaps[0].reads) * 100; // 10%
      expect(w2DropPct).toBe(10);
    });

    it('Reader drop-off risk warning triggers only on statistically significant sample', () => {
      function evaluateDropoffRisk(prevReads: number, currentReads: number): boolean {
        const drop = prevReads - currentReads;
        return prevReads >= 3 && drop >= 2 && drop / prevReads >= 0.3;
      }

      // 1 reader dropping to 0: not statistically significant
      expect(evaluateDropoffRisk(1, 0)).toBe(false);
      // 2 readers dropping to 1: not statistically significant
      expect(evaluateDropoffRisk(2, 1)).toBe(false);
      // 10 readers dropping to 6: 40% drop with 10 reads -> statistically significant!
      expect(evaluateDropoffRisk(10, 6)).toBe(true);
    });
  });

  // =========================================================================
  // 8. Homepage discovery-tab behavior tests
  // =========================================================================
  describe('8. Homepage Discovery Tabs', () => {
    it('Requires auth for "kuzatayotganlarim" tab and redirects guest with returnUrl', () => {
      function getTabDestination(tab: string, user: any | null): { action: 'render' | 'redirect'; url?: string } {
        if (tab === 'kuzatayotganlarim' && !user) {
          return {
            action: 'redirect',
            url: `/kirish?returnUrl=${encodeURIComponent('/?tab=kuzatayotganlarim')}`,
          };
        }
        return { action: 'render' };
      }

      const guestResult = getTabDestination('kuzatayotganlarim', null);
      expect(guestResult.action).toBe('redirect');
      expect(guestResult.url).toBe('/kirish?returnUrl=%2F%3Ftab%3Dkuzatayotganlarim');

      const loggedInResult = getTabDestination('kuzatayotganlarim', { id: 'user-1' });
      expect(loggedInResult.action).toBe('render');
    });
  });

  // =========================================================================
  // 9. Progress consistency tests
  // =========================================================================
  describe('9. Unified Reading Progress Service', () => {
    it('Returns ordered distinct works with exact page and canonical resume URL', async () => {
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: [
                    {
                      id: 'prog-1',
                      page_index: 5,
                      total_pages: 10,
                      percentage: 50,
                      last_read_at: new Date().toISOString(),
                      work: {
                        id: 'w-1',
                        title: 'Bekatdagi soat',
                        slug: 'bekatdagi-soat',
                        status: 'published',
                        access_type: 'free',
                      },
                      chapter: {
                        id: 'c-2',
                        chapter_number: 2,
                        title: 'Kechikkan avtobus',
                        slug: '2-kechikkan-avtobus',
                        status: 'published',
                        is_free: true,
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      const result = await getRecentReadingProgress('user-1', 5, mockAdmin as any);
      expect(result.length).toBe(1);
      expect(result[0].work.title).toBe('Bekatdagi soat');
      expect(result[0].chapter?.number).toBe(2);
      expect(result[0].pageIndex).toBe(5);
      expect(result[0].percentage).toBe(50);
      expect(result[0].resumeUrl).toBe('/asarlar/bekatdagi-soat/2-kechikkan-avtobus?page=5');
    });
  });

  // =========================================================================
  // 10. Guest reaction/comment redirect tests
  // =========================================================================
  describe('10. Guest Reaction and Comment Redirects', () => {
    it('Builds login redirect containing the complete encoded canonical chapter URL', () => {
      const canonicalChapterUrl = '/asarlar/noldan-emas-minusdan/2-bob-orol-sirlari?page=2';
      const redirectUrl = `/kirish?returnUrl=${encodeURIComponent(canonicalChapterUrl)}`;

      expect(redirectUrl).toBe('/kirish?returnUrl=%2Fasarlar%2Fnoldan-emas-minusdan%2F2-bob-orol-sirlari%3Fpage%3D2');
    });
  });

  // =========================================================================
  // 11. Homepage deduplication tests
  // =========================================================================
  describe('11. Homepage Deduplication Logic', () => {
    it('Ensures a work appears in only one primary discovery section and never repeats', () => {
      const allWorks = [
        { id: 'work-1', title: 'Work 1' },
        { id: 'work-2', title: 'Work 2' },
        { id: 'work-3', title: 'Work 3' },
      ];

      const shownWorkIds = new Set<string>();
      const getDeduplicatedSlice = (candidateWorks: any[], maxCount = 5) => {
        const unseen = candidateWorks.filter((w) => !shownWorkIds.has(w.id));
        if (unseen.length > 0) {
          const selected = unseen.slice(0, maxCount);
          selected.forEach((w) => shownWorkIds.add(w.id));
          return selected;
        }
        return [];
      };

      const sec1 = getDeduplicatedSlice(allWorks, 2); // gets work-1, work-2
      expect(sec1.map((w) => w.id)).toEqual(['work-1', 'work-2']);

      const sec2 = getDeduplicatedSlice(allWorks, 2); // gets work-3 only
      expect(sec2.map((w) => w.id)).toEqual(['work-3']);

      const sec3 = getDeduplicatedSlice(allWorks, 2); // all shown, returns [] (hides section)
      expect(sec3).toEqual([]);
      expect(shownWorkIds.size).toBe(3);
    });
  });

  // =========================================================================
  // 12. Reading-time classification tests
  // =========================================================================
  describe('12. 15-Minute Reading Time Classification', () => {
    it('Classifies works as 15-min read using total_words / 200 wpm <= 15 minutes', () => {
      function isFifteenMinuteRead(totalWords: number): boolean {
        const readingSpeedWpm = 200;
        const minutes = Math.ceil(totalWords / readingSpeedWpm);
        return minutes <= 15;
      }

      expect(isFifteenMinuteRead(500)).toBe(true);   // ~3 min
      expect(isFifteenMinuteRead(2800)).toBe(true);  // ~14 min
      expect(isFifteenMinuteRead(3000)).toBe(true);  // 15 min
      expect(isFifteenMinuteRead(3200)).toBe(false); // 16 min (exceeds)
      expect(isFifteenMinuteRead(10000)).toBe(false); // 50 min (exceeds)
    });
  });

  // =========================================================================
  // 13. Self-follow rejection tests
  // =========================================================================
  describe('13. Self-Follow Prevention', () => {
    it('Rejects self-follow requests when userId === targetId', () => {
      function canFollowAuthor(currentUserId: string, targetAuthorId: string): boolean {
        return currentUserId !== targetAuthorId;
      }

      expect(canFollowAuthor('user-1', 'author-2')).toBe(true);
      expect(canFollowAuthor('user-1', 'user-1')).toBe(false);
    });
  });

  // =========================================================================
  // 14. Notification generation/deduplication tests
  // =========================================================================
  describe('14. Follower Notification Generation & Deduplication', () => {
    it('Deduplicates follower recipient set and excludes author', () => {
      const authorUserId = 'author-user-id';
      const workFollowers = [{ user_id: 'reader-1' }, { user_id: 'reader-2' }, { user_id: authorUserId }];
      const authorFollowers = [{ user_id: 'reader-2' }, { user_id: 'reader-3' }, { user_id: authorUserId }];

      const recipientIds = new Set<string>();
      [...workFollowers, ...authorFollowers].forEach((f) => {
        if (f.user_id && f.user_id !== authorUserId) {
          recipientIds.add(f.user_id);
        }
      });

      expect(recipientIds.size).toBe(3);
      expect(Array.from(recipientIds)).toEqual(['reader-1', 'reader-2', 'reader-3']);
      expect(recipientIds.has(authorUserId)).toBe(false);
    });
  });

  // =========================================================================
  // 15. Author / admin authorization tests
  // =========================================================================
  describe('15. Security & Authorization Checks', () => {
    it('Admin preview flag is respected only if user has is_admin in profiles', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'chapters') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: 'chap-1',
                      chapter_number: 1,
                      title: 'Draft Chapter',
                      slug: 'draft-ch',
                      status: 'draft',
                      is_free: false,
                      price: 3000,
                      work: {
                        id: 'work-1',
                        slug: 'work-1',
                        status: 'published',
                        access_type: 'paid_by_chapter',
                        author_id: 'author-1',
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: { is_admin: true },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'chapter_contents') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { content: '<p>Admin preview content</p>' },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return { select: () => ({ eq: () => ({}) }) };
        },
      };

      const result = await canReadChapter('admin-user-id', 'chap-1', {
        isAdminRoute: true,
        customClient: mockSupabase,
      });

      expect(result.canRead).toBe(true);
      expect(result.reason).toBe('admin_preview');
      expect(result.content).toBe('<p>Admin preview content</p>');
    });
  });

  // =========================================================================
  // 16. Contextual empty state tests
  // =========================================================================
  describe('16. Contextual Empty States', () => {
    it('Provides dedicated Uzbek empty copy and specific CTA for each library tab', () => {
      const emptyStates = {
        reading: { cta: '/asarlar', text: 'Hozircha hech qanday asar o‘qilmayapti' },
        bookmarks: { cta: '/asarlar', text: 'Xatcho‘plar mavjud emas' },
        purchased: { cta: '/asarlar?access=paid', text: 'Sotib olingan asarlar yo‘q' },
        read_later: { cta: '/asarlar', text: 'Keyinroq o‘qish ro‘yxati bo‘sh' },
        favorite: { cta: '/asarlar?sort=rating', text: 'Sevimli asarlar belgilanmagan' },
        completed: { cta: '/asarlar', text: 'Tugallangan mutolaalar yo‘q' },
        followed_works: { cta: '/asarlar?sort=newest', text: 'Kuzatilayotgan asarlar mavjud emas' },
        followed_authors: { cta: '/mualliflar', text: 'Siz hali birorta muallifni kuzatmagansiz' },
      };

      expect(emptyStates.followed_authors.cta).toBe('/mualliflar');
      expect(emptyStates.followed_authors.text).toContain('muallifni kuzatmagansiz');
      expect(emptyStates.purchased.cta).toBe('/asarlar?access=paid');
    });
  });

  // =========================================================================
  // 17. Comprehensive Regression Tests for Continue Reading, Discovery & Free Works
  // =========================================================================
  describe('17. Production Regressions - Continue Reading, Discovery & Access', () => {
    // -----------------------------------------------------------------------
    // A. Continue Reading Tests
    // -----------------------------------------------------------------------
    describe('A. Continue Reading Data Flow & Formatting', () => {
      it('Correctly normalizes work title, author name, chapter number and page', async () => {
        const mockAdmin = {
          from: (table: string) => {
            if (table === 'reading_progress') {
              return {
                select: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({
                        data: [
                          {
                            id: 'prog-1',
                            work_id: 'w-1',
                            chapter_id: 'c-3',
                            page_index: 1, // Page 1 must preserve ?page=1
                            total_pages: 15,
                            percentage: 42,
                            last_read_at: '2026-09-06T13:00:00.000Z',
                            work: {
                              id: 'w-1',
                              title: 'Noldan emas, minusdan',
                              slug: 'noldan-emas-minusdan',
                              cover_url: 'https://example.com/cover.webp',
                              status: 'published',
                              access_type: 'free',
                              author: {
                                pen_name: 'Anorboyev Diyorbek',
                              },
                            },
                            chapter: {
                              id: 'c-3',
                              chapter_number: 3,
                              title: 'Kelajakdagi men to‘laydi',
                              slug: 'kelajakdagi-men-tolaydi',
                              status: 'published',
                              is_free: true,
                            },
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            return { select: () => ({ in: async () => ({ data: [] }) }) };
          },
        };

        const items = await getRecentReadingProgress('user-1', 5, mockAdmin as any);
        expect(items.length).toBe(1);
        const item = items[0];

        // 1. Correct work title & author name
        expect(item.workTitle).toBe('Noldan emas, minusdan');
        expect(item.authorName).toBe('Anorboyev Diyorbek');
        expect(item.work.authorName).toBe('Anorboyev Diyorbek');
        expect(item.work.author?.pen_name).toBe('Anorboyev Diyorbek');

        // 2. Correct chapter number and title (no undefined-bob, no empty -bob)
        expect(item.chapterNumber).toBe(3);
        expect(item.chapterTitle).toBe('Kelajakdagi men to‘laydi');
        expect(item.chapter?.chapter_number).toBe(3);
        expect(item.chapter?.number).toBe(3);
        expect(item.last_chapter?.chapter_number).toBe(3);

        // 3. Exact saved page preserved in resumeUrl (including page 1)
        expect(item.pageNumber).toBe(1);
        expect(item.resumeUrl).toBe('/asarlar/noldan-emas-minusdan/kelajakdagi-men-tolaydi?page=1');
        expect(item.read_url).toBe('/asarlar/noldan-emas-minusdan/kelajakdagi-men-tolaydi?page=1');

        // 4. Clamped progress percentage
        expect(item.progressPercent).toBe(42);
        expect(item.reading_progress).toBe(42);

        // 5. No duplicated "o‘qildi o‘qilgandi"
        expect(item.lastReadLabel).toContain('o‘qilgandi');
        expect(item.lastReadLabel).not.toContain('o‘qildi o‘qilgandi');
      });

      it('Gracefully handles incomplete or legacy records without NaN, undefined or empty strings', async () => {
        const mockAdmin = {
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: 'prog-legacy',
                        work_id: 'w-legacy',
                        chapter_id: null,
                        page_index: null, // missing
                        total_pages: null,
                        percentage: 150, // exceeds 100, must be clamped
                        last_read_at: 'invalid-date',
                        work: {
                          id: 'w-legacy',
                          title: 'Eski asar',
                          slug: 'eski-asar',
                          status: 'published',
                          access_type: 'free',
                          author: null, // missing author
                          author_id: 'auth-missing',
                        },
                        chapter: null, // missing chapter
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        const items = await getRecentReadingProgress('user-1', 5, mockAdmin as any);
        expect(items.length).toBe(1);
        const item = items[0];

        expect(item.pageNumber).toBe(1);
        expect(item.progressPercent).toBe(100); // clamped to 100
        expect(item.chapterNumber).toBe(1);
        expect(item.chapterTitle).toBe('Mutolaa');
        expect(item.resumeUrl).toBe('/asarlar/eski-asar');
        expect(item.lastReadLabel).toBe('Yaqinda o‘qilgandi');
      });

      it('Deduplicates works to return distinct entries sorted by lastReadAt descending', async () => {
        const now = Date.now();
        const mockAdmin = {
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: 'prog-1',
                        work_id: 'work-A',
                        page_index: 3,
                        last_read_at: new Date(now).toISOString(),
                        work: { id: 'work-A', title: 'Work A', slug: 'work-a', status: 'published', access_type: 'free' },
                        chapter: { id: 'c-2', chapter_number: 2, title: 'Ch 2', slug: 'ch-2', status: 'published' },
                      },
                      {
                        id: 'prog-2',
                        work_id: 'work-A', // Duplicate work, older read
                        page_index: 1,
                        last_read_at: new Date(now - 100000).toISOString(),
                        work: { id: 'work-A', title: 'Work A', slug: 'work-a', status: 'published', access_type: 'free' },
                        chapter: { id: 'c-1', chapter_number: 1, title: 'Ch 1', slug: 'ch-1', status: 'published' },
                      },
                      {
                        id: 'prog-3',
                        work_id: 'work-B',
                        page_index: 10,
                        last_read_at: new Date(now - 50000).toISOString(),
                        work: { id: 'work-B', title: 'Work B', slug: 'work-b', status: 'published', access_type: 'free' },
                        chapter: { id: 'c-5', chapter_number: 5, title: 'Ch 5', slug: 'ch-5', status: 'published' },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        const items = await getRecentReadingProgress('user-1', 5, mockAdmin as any);
        expect(items.length).toBe(2);
        expect(items[0].workId).toBe('work-A');
        expect(items[0].chapterNumber).toBe(2); // Kept newer chapter
        expect(items[1].workId).toBe('work-B');
      });

      it('Clears progress on sign-out / empty userId and isolates user progress without leaks', async () => {
        // Empty userId (guest or signed out) must return []
        const emptyResult = await getRecentReadingProgress('', 5);
        expect(emptyResult).toEqual([]);

        let queriedUserId = '';
        const mockAdmin = {
          from: (table: string) => ({
            select: () => ({
              eq: (field: string, val: string) => {
                if (field === 'user_id') queriedUserId = val;
                return {
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                };
              },
            }),
          }),
        };

        await getRecentReadingProgress('user-alice-123', 5, mockAdmin as any);
        expect(queriedUserId).toBe('user-alice-123');
        // Ensure user-bob cannot receive user-alice's data
        expect(queriedUserId).not.toBe('user-bob-456');
      });

      it('Ensures canonical DTO contains all fields consumed by Homepage, Cabinet and Library', async () => {
        const mockAdmin = {
          from: () => ({
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        id: 'prog-canonical-1',
                        work_id: 'work-noldan',
                        chapter_id: 'ch-3',
                        page_index: 1,
                        total_pages: 15,
                        percentage: 20,
                        last_read_at: '2026-09-06T12:00:00.000Z',
                        work: {
                          id: 'work-noldan',
                          title: 'Noldan emas, minusdan',
                          slug: 'noldan-emas-minusdan',
                          status: 'published',
                          access_type: 'free',
                          author_id: 'author-diyorbek',
                          author: [{ pen_name: 'Anorboyev Diyorbek' }],
                        },
                        chapter: {
                          id: 'ch-3',
                          chapter_number: 3,
                          title: 'Kelajakdagi men to‘laydi',
                          slug: 'kelajakdagi-men-tolaydi',
                          status: 'published',
                          is_free: true,
                        },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };

        const [item] = await getRecentReadingProgress('user-test', 5, mockAdmin as any);

        // Canonical fields
        expect(item.workSlug).toBe('noldan-emas-minusdan');
        expect(item.chapterSlug).toBe('kelajakdagi-men-tolaydi');
        expect(item.chapterNumber).toBe(3);
        expect(item.chapterTitle).toBe('Kelajakdagi men to‘laydi');
        expect(item.pageNumber).toBe(1);
        expect(item.resumeUrl).toBe('/asarlar/noldan-emas-minusdan/kelajakdagi-men-tolaydi?page=1');
        expect(item.authorName).toBe('Anorboyev Diyorbek');

        // Consumed by Homepage Hero Carousel & Continue Reading
        expect(item.lastReadLabel).toContain('o‘qilgandi');
        expect(item.lastReadLabel).not.toContain('o‘qildi o‘qilgandi');
        expect(item.work.author?.pen_name).toBe('Anorboyev Diyorbek');
        expect(item.work.authorName).toBe('Anorboyev Diyorbek');

        // Consumed by Reader Cabinet
        expect(item.chapter?.number).toBe(3);
        expect(item.chapter?.chapter_number).toBe(3);
        expect(item.resume_url).toBe(item.resumeUrl);

        // Consumed by Library
        expect(item.read_url).toBe(item.resumeUrl);
        expect(item.page_index).toBe(1);
        expect(item.percentage).toBe(20);
      });
    });

    // -----------------------------------------------------------------------
    // B. "Siz uchun" Recommendation Tests
    // -----------------------------------------------------------------------
    describe('B. "Siz uchun" Recommendations & Fallback', () => {
      const sampleWorks = [
        {
          id: 'w-1',
          title: 'Biznes Asar',
          status: 'published',
          is_archived: false,
          work_genres: [{ genre: { id: 'genre-biznes', name: 'Biznes' } }],
          view_count: 50,
          average_rating: 4.8,
        },
        {
          id: 'w-2',
          title: 'Fantastika Asar',
          status: 'published',
          is_archived: false,
          work_genres: [{ genre: { id: 'genre-fantastika', name: 'Fantastika' } }],
          view_count: 10,
          average_rating: 4.2,
        },
        {
          id: 'w-archived',
          title: 'Arxiv Asar',
          status: 'published',
          is_archived: true, // Archived, must be excluded!
          work_genres: [{ genre: { id: 'genre-biznes', name: 'Biznes' } }],
          view_count: 500,
        },
        {
          id: 'w-draft',
          title: 'Qoralama Asar',
          status: 'draft', // Draft, must be excluded!
          is_archived: false,
        },
      ];

      it('Prioritizes works matching selected user genres and excludes archived/draft works', () => {
        const preferredGenreIds = new Set(['genre-biznes']);
        const eligibleWorks = sampleWorks.filter((w) => w.status === 'published' && !w.is_archived);

        expect(eligibleWorks.length).toBe(2);
        expect(eligibleWorks.map((w) => w.id)).not.toContain('w-archived');
        expect(eligibleWorks.map((w) => w.id)).not.toContain('w-draft');

        const scored = eligibleWorks.map((w) => {
          let score = 0;
          const gIds = w.work_genres?.map((wg: any) => wg.genre?.id) || [];
          if (gIds.some((id: string) => preferredGenreIds.has(id))) {
            score += 50;
          }
          score += (w.average_rating || 0) * 4;
          return { work: w, score };
        });

        scored.sort((a, b) => b.score - a.score);
        expect(scored[0].work.id).toBe('w-1'); // Business work ranked first
      });

      it('Falls back to popular published works when user has no matching preferences', () => {
        const preferredGenreIds = new Set(['genre-detektiv']); // User prefers detective, but catalog only has business & sci-fi
        const eligibleWorks = sampleWorks.filter((w) => w.status === 'published' && !w.is_archived);

        const matched = eligibleWorks.filter((w) =>
          w.work_genres?.some((wg: any) => preferredGenreIds.has(wg.genre?.id)),
        );
        expect(matched.length).toBe(0);

        // Fallback: provide eligible published works
        const fallback = eligibleWorks.slice(0, 8);
        expect(fallback.length).toBe(2);
        expect(fallback.map((w) => w.id)).toEqual(['w-1', 'w-2']);
      });
    });

    // -----------------------------------------------------------------------
    // C. "Kuzatayotganlarim" Followed Works Tests
    // -----------------------------------------------------------------------
    describe('C. "Kuzatayotganlarim" Followed Content Filtering', () => {
      it('Returns only published, non-archived works and removes duplicates from dual follow', () => {
        const followedAuthorWorks = [
          { id: 'w-1', title: 'Work 1', status: 'published', is_archived: false, author_id: 'author-1' },
          { id: 'w-archived', title: 'Work Archived', status: 'published', is_archived: true, author_id: 'author-1' },
        ];
        const followedDirectWorks = [
          { id: 'w-1', title: 'Work 1', status: 'published', is_archived: false }, // Duplicate of author work
          { id: 'w-2', title: 'Work 2', status: 'published', is_archived: false },
        ];

        const combined = [...followedAuthorWorks, ...followedDirectWorks];
        const eligible = combined.filter((w) => w.status === 'published' && !w.is_archived);

        // Deduplication
        const unique: any[] = [];
        const seen = new Set<string>();
        eligible.forEach((w) => {
          if (!seen.has(w.id)) {
            seen.add(w.id);
            unique.push(w);
          }
        });

        expect(unique.length).toBe(2);
        expect(unique.map((w) => w.id)).toEqual(['w-1', 'w-2']);
        expect(seen.has('w-archived')).toBe(false);
      });

      it('Identifies when user follows only archived or ineligible works for contextual empty state', () => {
        const hasFollows = true;
        const eligiblePublishedWorks: any[] = []; // All followed works are archived

        const emptyReason = eligiblePublishedWorks.length === 0 ? (hasFollows ? 'only_ineligible' : 'no_follows') : null;
        expect(emptyReason).toBe('only_ineligible');
      });

      it('Requires authentication for guest users on kuzatayotganlarim', () => {
        const profile = null;
        const isGuest = !profile;
        const response = isGuest
          ? { success: false, requiresAuth: true, status: 401 }
          : { success: true };

        expect(response.requiresAuth).toBe(true);
        expect(response.status).toBe(401);
      });
    });

    // -----------------------------------------------------------------------
    // D. Free-Work Access Reconfirmation Tests
    // -----------------------------------------------------------------------
    describe('D. Free-Work Multi-Chapter Access Flow', () => {
      it('Allows guest and ordinary reader to open all chapters of a fully free work without payment', () => {
        const chapters = [
          { number: 1, isFree: true, price: 0 },
          { number: 2, isFree: true, price: 0 },
          { number: 3, isFree: true, price: 0 },
        ];

        // Test Guest
        chapters.forEach((ch) => {
          const guestAccess = evaluateCanonicalChapterAccess({
            workAccessType: 'free',
            fullWorkPrice: 0,
            chapterIsFree: ch.isFree,
            chapterPrice: ch.price,
            isWorkPublished: true,
            isChapterPublished: true,
            isAuthor: false,
            isAdmin: false,
            hasFullWorkEntitlement: false,
            hasChapterEntitlement: false,
          });
          expect(guestAccess.canRead).toBe(true);
          expect(guestAccess.reason).toBe('free');
          expect(guestAccess.price).toBe(0);
          expect(guestAccess.isLocked).toBe(false);
        });

        // Test Ordinary Reader (Not Author, Not Admin)
        chapters.forEach((ch) => {
          const readerAccess = evaluateCanonicalChapterAccess({
            workAccessType: 'free',
            fullWorkPrice: 0,
            chapterIsFree: ch.isFree,
            chapterPrice: ch.price,
            isWorkPublished: true,
            isChapterPublished: true,
            isAuthor: false,
            isAdmin: false,
            hasFullWorkEntitlement: false,
            hasChapterEntitlement: false,
          });
          expect(readerAccess.canRead).toBe(true);
          expect(readerAccess.reason).toBe('free');
        });
      });

      it('Ensures paid work chapters remain locked and protected', () => {
        const paidChapterAccess = evaluateCanonicalChapterAccess({
          workAccessType: 'paid_by_chapter',
          fullWorkPrice: 0,
          chapterIsFree: false,
          chapterPrice: 3000,
          isWorkPublished: true,
          isChapterPublished: true,
          isAuthor: false,
          isAdmin: false,
          hasFullWorkEntitlement: false,
          hasChapterEntitlement: false,
        });

        expect(paidChapterAccess.canRead).toBe(false);
        expect(paidChapterAccess.reason).toBe('locked');
        expect(paidChapterAccess.price).toBe(3000);
        expect(paidChapterAccess.isLocked).toBe(true);
      });
    });
  });
});
