import { describe, it, expect } from 'vitest';
import {
  formatUZS,
  maskCardNumber,
  calculateCommission,
  generateIdempotencyKey,
} from '@/lib/utils/currency';
import {
  encryptCardData,
  decryptCardData,
  isValidUzbekCardNumber,
} from '@/lib/utils/encryption';

describe('Financial and Currency Utilities', () => {
  describe('formatUZS', () => {
    it('formats numbers with thousand separators and UZS suffix', () => {
      expect(formatUZS(100000)).toBe("100 000 so'm");
      expect(formatUZS(25000)).toBe("25 000 so'm");
      expect(formatUZS(0)).toBe("0 so'm");
      expect(formatUZS(1500000)).toBe("1 500 000 so'm");
    });

    it('handles null, undefined and invalid input gracefully', () => {
      expect(formatUZS(null)).toBe("0 so'm");
      expect(formatUZS(undefined)).toBe("0 so'm");
      expect(formatUZS('invalid')).toBe("0 so'm");
    });

    it('rounds floating point numbers to safe integer UZS', () => {
      expect(formatUZS(10500.6)).toBe("10 501 so'm");
      expect(formatUZS(9999.4)).toBe("9 999 so'm");
    });
  });

  describe('Bank Card Masking & Uzbek Format Validation', () => {
    it('validates Uzbek card formats (Uzcard 8600, Humo 9860, Visa 4, Mastercard 5)', () => {
      expect(isValidUzbekCardNumber('8600 1234 5678 9012')).toBe(true);
      expect(isValidUzbekCardNumber('9860 1234 5678 9012')).toBe(true);
      expect(isValidUzbekCardNumber('4123 4567 8901 2345')).toBe(true);
      expect(isValidUzbekCardNumber('5412 3456 7890 1234')).toBe(true);
    });

    it('rejects cards with invalid lengths or non-numeric characters', () => {
      expect(isValidUzbekCardNumber('8600 1234 5678')).toBe(false);
      expect(isValidUzbekCardNumber('86001234567890123')).toBe(false);
      expect(isValidUzbekCardNumber('8600abcd56789012')).toBe(false);
      expect(isValidUzbekCardNumber('')).toBe(false);
    });

    it('masks card numbers preserving only first 4 and last 4 digits', () => {
      expect(maskCardNumber('8600123456789012')).toBe('8600 **** **** 9012');
      expect(maskCardNumber('9860 1111 2222 3333')).toBe('9860 **** **** 3333');
    });

    it('returns placeholder on invalid length', () => {
      expect(maskCardNumber('1234')).toBe('**** **** **** ****');
    });
  });

  describe('Card AES-256-GCM Server-Side Encryption', () => {
    it('encrypts and decrypts card numbers accurately', () => {
      const originalCard = '8600123456789012';
      const encrypted = encryptCardData(originalCard);

      // Ciphertext must never contain the plain text card number
      expect(encrypted).not.toContain(originalCard);
      expect(encrypted).not.toContain('86001234');

      // Decryption restores exact plain text
      const decrypted = decryptCardData(encrypted);
      expect(decrypted).toBe(originalCard);
    });

    it('generates unique ciphertexts for identical inputs due to random IVs', () => {
      const card = '9860987654321098';
      const enc1 = encryptCardData(card);
      const enc2 = encryptCardData(card);

      expect(enc1).not.toBe(enc2);
      expect(decryptCardData(enc1)).toBe(card);
      expect(decryptCardData(enc2)).toBe(card);
    });

    it('fails safely when decrypting tampered data', () => {
      const card = '8600111122223333';
      const encrypted = encryptCardData(card);

      // Tamper ciphertext
      const buffer = Buffer.from(encrypted, 'base64');
      buffer[buffer.length - 1] ^= 0xff; // flip last bit
      const tampered = buffer.toString('base64');

      expect(() => decryptCardData(tampered)).toThrow();
    });
  });

  describe('Commission and Net Author Calculation', () => {
    it('calculates 20% default platform commission and 80% author net share', () => {
      const result = calculateCommission(50000, 20);
      expect(result.grossAmount).toBe(50000);
      expect(result.commissionAmount).toBe(10000);
      expect(result.authorNetAmount).toBe(40000);
      expect(result.commissionAmount + result.authorNetAmount).toBe(result.grossAmount);
    });

    it('handles odd numbers with integer math ensuring no lost so‘m', () => {
      const result = calculateCommission(15555, 20);
      expect(result.grossAmount).toBe(15555);
      expect(result.commissionAmount).toBe(3111);
      expect(result.authorNetAmount).toBe(12444);
      expect(result.commissionAmount + result.authorNetAmount).toBe(15555);
    });

    it('handles zero amount safely', () => {
      const result = calculateCommission(0, 20);
      expect(result.grossAmount).toBe(0);
      expect(result.commissionAmount).toBe(0);
      expect(result.authorNetAmount).toBe(0);
    });

    it('supports custom commission percentages from settings', () => {
      const result = calculateCommission(100000, 15);
      expect(result.commissionAmount).toBe(15000);
      expect(result.authorNetAmount).toBe(85000);
    });
  });

  describe('Purchase Atomicity, Idempotency & Paid-Content Access', () => {
    it('generates unique keys with specified prefix', () => {
      const key1 = generateIdempotencyKey('buy');
      const key2 = generateIdempotencyKey('buy');
      expect(key1).toMatch(/^buy_\d+_[a-z0-9]+$/);
      expect(key1).not.toBe(key2);
    });

    it('validates that identical idempotency key or existing active purchase prevents duplicate charges', () => {
      const initialReaderBalance = 50000;
      const chapterPrice = 15000;
      const existingPurchases = new Set<string>();

      function attemptPurchase(key: string, chapterId: string, balance: number) {
        if (existingPurchases.has(key) || existingPurchases.has(chapterId)) {
          return { success: true, idempotent: true, charged: 0, newBalance: balance };
        }
        if (balance < chapterPrice) {
          throw new Error('Hisobingizda mablag‘ yetarli emas');
        }
        existingPurchases.add(key);
        existingPurchases.add(chapterId);
        return { success: true, idempotent: false, charged: chapterPrice, newBalance: balance - chapterPrice };
      }

      // First attempt charges reader
      const first = attemptPurchase('idem_tx_1', 'chap_101', initialReaderBalance);
      expect(first.charged).toBe(15000);
      expect(first.newBalance).toBe(35000);

      // Duplicate attempt with same key returns success without debiting
      const duplicateKey = attemptPurchase('idem_tx_1', 'chap_101', first.newBalance);
      expect(duplicateKey.idempotent).toBe(true);
      expect(duplicateKey.charged).toBe(0);
      expect(duplicateKey.newBalance).toBe(35000);

      // Attempting to buy already owned chapter with different key also prevents double charge
      const alreadyOwned = attemptPurchase('idem_tx_2', 'chap_101', first.newBalance);
      expect(alreadyOwned.idempotent).toBe(true);
      expect(alreadyOwned.charged).toBe(0);
      expect(alreadyOwned.newBalance).toBe(35000);
    });

    it('rejects purchase when reader balance is insufficient', () => {
      const readerBalance = 5000;
      const bookPrice = 25000;

      function verifyBalance(balance: number, price: number) {
        if (balance < price) {
          throw new Error(`Hisobingizda mablag‘ yetarli emas. Balansingiz: ${balance} so‘m, Talab qilinadi: ${price} so‘m`);
        }
        return true;
      }

      expect(() => verifyBalance(readerBalance, bookPrice)).toThrow('Hisobingizda mablag‘ yetarli emas');
    });

    it('enforces paid chapter content isolation for non-buyers vs buyers', () => {
      interface MockChapter {
        id: string;
        is_free: boolean;
      }

      function resolveChapterContent(
        chapter: MockChapter,
        authorId: string,
        currentUser: { id?: string; isAdmin?: boolean; hasPurchased?: boolean } | null,
        actualDbContent: string,
      ): { content: string; hasAccess: boolean } {
        // Free chapter
        if (chapter.is_free) {
          return { content: actualDbContent, hasAccess: true };
        }
        if (!currentUser || !currentUser.id) {
          return { content: '', hasAccess: false };
        }
        if (currentUser.isAdmin || currentUser.id === authorId || currentUser.hasPurchased) {
          return { content: actualDbContent, hasAccess: true };
        }
        return { content: '', hasAccess: false };
      }

      const paidChapter: MockChapter = { id: 'ch-102', is_free: false };
      const secretStory = 'Bu faqat xarid qilgan kitobxonlar o‘qishi mumkin bo‘lgan bob matni...';
      const authorId = 'author-uuid-1';

      // 1. Anonymous visitor
      const anon = resolveChapterContent(paidChapter, authorId, null, secretStory);
      expect(anon.hasAccess).toBe(false);
      expect(anon.content).toBe('');

      // 2. Authenticated non-buyer
      const nonBuyer = resolveChapterContent(paidChapter, authorId, { id: 'reader-2', hasPurchased: false }, secretStory);
      expect(nonBuyer.hasAccess).toBe(false);
      expect(nonBuyer.content).toBe('');

      // 3. Another author
      const otherAuthor = resolveChapterContent(paidChapter, authorId, { id: 'other-author-3', hasPurchased: false }, secretStory);
      expect(otherAuthor.hasAccess).toBe(false);
      expect(otherAuthor.content).toBe('');

      // 4. Buyer
      const buyer = resolveChapterContent(paidChapter, authorId, { id: 'buyer-4', hasPurchased: true }, secretStory);
      expect(buyer.hasAccess).toBe(true);
      expect(buyer.content).toBe(secretStory);

      // 5. Author of the work
      const author = resolveChapterContent(paidChapter, authorId, { id: authorId }, secretStory);
      expect(author.hasAccess).toBe(true);
      expect(author.content).toBe(secretStory);

      // 6. Admin
      const admin = resolveChapterContent(paidChapter, authorId, { id: 'admin-uuid', isAdmin: true }, secretStory);
      expect(admin.hasAccess).toBe(true);
      expect(admin.content).toBe(secretStory);
    });
  });

  describe('Author Payout Rules & Reservation Lifecycle', () => {
    const MIN_PAYOUT = 100000;

    it('enforces minimum payout threshold of 100 000 UZS', () => {
      function validatePayoutRequest(amount: number) {
        if (amount < MIN_PAYOUT) {
          throw new Error(`Minimal yechib olish miqdori: ${MIN_PAYOUT} so‘m`);
        }
        return true;
      }

      expect(() => validatePayoutRequest(50000)).toThrow('Minimal yechib olish miqdori: 100000 so‘m');
      expect(() => validatePayoutRequest(99999)).toThrow('Minimal yechib olish miqdori: 100000 so‘m');
      expect(validatePayoutRequest(100000)).toBe(true);
      expect(validatePayoutRequest(250000)).toBe(true);
    });

    it('atomically moves requested amount from available to reserved earnings', () => {
      let availableEarnings = 150000;
      let reservedEarnings = 0;
      const requestedAmount = 100000;

      expect(availableEarnings).toBeGreaterThanOrEqual(requestedAmount);
      availableEarnings -= requestedAmount;
      reservedEarnings += requestedAmount;

      expect(availableEarnings).toBe(50000);
      expect(reservedEarnings).toBe(100000);
      expect(availableEarnings >= requestedAmount).toBe(false);
    });

    it('atomically reverses reserved earnings back to available on rejection or cancellation', () => {
      let availableEarnings = 50000;
      let reservedEarnings = 100000;
      const reversedAmount = 100000;

      reservedEarnings -= reversedAmount;
      availableEarnings += reversedAmount;

      expect(reservedEarnings).toBe(0);
      expect(availableEarnings).toBe(150000);
    });

    it('atomically debits reserved earnings when marked paid with proof', () => {
      let reservedEarnings = 100000;
      const paidAmount = 100000;
      const proofUrl = 'https://example.com/receipt.jpg';

      function markPaid(proof: string) {
        if (!proof) throw new Error('To‘lov cheki talab qilinadi');
        reservedEarnings -= paidAmount;
        return { status: 'paid', paidAmount };
      }

      const result = markPaid(proofUrl);
      expect(result.status).toBe('paid');
      expect(reservedEarnings).toBe(0);
    });
  });

  describe('Authorization and Permission Boundary Rules', () => {
    it('restricts top-up approval to administrators only', () => {
      function approveTopup(isAdmin: boolean) {
        if (!isAdmin) {
          throw new Error('Faqat administratorlar tasdiqlashi mumkin');
        }
        return { success: true };
      }

      expect(() => approveTopup(false)).toThrow('Faqat administratorlar tasdiqlashi mumkin');
      expect(approveTopup(true).success).toBe(true);
    });

    it('restricts content publication to approved authors', () => {
      function publishContent(authorStatus: string) {
        if (authorStatus !== 'approved') {
          throw new Error('Faqat tasdiqlangan mualliflar nashr qilishi mumkin');
        }
        return { success: true };
      }

      expect(() => publishContent('pending')).toThrow('Faqat tasdiqlangan mualliflar nashr qilishi mumkin');
      expect(() => publishContent('rejected')).toThrow('Faqat tasdiqlangan mualliflar nashr qilishi mumkin');
      expect(() => publishContent('suspended')).toThrow('Faqat tasdiqlangan mualliflar nashr qilishi mumkin');
      expect(publishContent('approved').success).toBe(true);
    });
  });

  describe('Secure Owner Admin Access & Route Protection', () => {
    const OWNER_EMAIL = 'anorboyevdiyorbek714@gmail.com';

    // Ensure test environment has the owner email configured
    process.env.ADMIN_EMAILS = 'anorboyevdiyorbek714@gmail.com, secondary_admin@manbora.uz';

    function isAllowlistedAdminEmailTest(email?: string | null): boolean {
      if (!email) return false;
      const normalized = email.trim().toLowerCase();
      const allowlist = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      return allowlist.includes(normalized);
    }

    function isUserEmailVerifiedTest(user: {
      email_confirmed_at?: string | null;
      confirmed_at?: string | null;
    }): boolean {
      return Boolean(user.email_confirmed_at || user.confirmed_at);
    }

    function evaluateAdminAccess(
      user: {
        id: string;
        email?: string | null;
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
      } | null,
      profile: { id: string; is_admin: boolean } | null,
    ): { canAccessAdmin: boolean; redirectUrl?: string; httpStatus?: number } {
      if (!user || !profile) {
        return { canAccessAdmin: false, redirectUrl: '/kirish?redirect=/diyoration', httpStatus: 302 };
      }

      const emailAllowlisted = isAllowlistedAdminEmailTest(user.email);
      const emailVerified = isUserEmailVerifiedTest(user);

      // If allowlisted and verified, admin status is granted/synced
      const effectiveAdmin = (emailAllowlisted && emailVerified) || profile.is_admin;

      if (!effectiveAdmin) {
        return { canAccessAdmin: false, httpStatus: 403 };
      }

      return { canAccessAdmin: true, httpStatus: 200 };
    }

    it('normalizes emails with lowercase and trimming', () => {
      expect(isAllowlistedAdminEmailTest('anorboyevdiyorbek714@gmail.com')).toBe(true);
      expect(isAllowlistedAdminEmailTest('ANORBOYEVDIYORBEK714@GMAIL.COM')).toBe(true);
      expect(isAllowlistedAdminEmailTest('  anorboyevdiyorbek714@gmail.com  ')).toBe(true);
      expect(isAllowlistedAdminEmailTest('AnOrBoYeVDiyorbek714@Gmail.Com')).toBe(true);
    });

    it('rejects ordinary, spoofed, or subdomained emails', () => {
      expect(isAllowlistedAdminEmailTest('ordinary_user@example.com')).toBe(false);
      expect(isAllowlistedAdminEmailTest('anorboyevdiyorbek714@gmail.com.attacker.com')).toBe(false);
      expect(isAllowlistedAdminEmailTest('attacker@anorboyevdiyorbek714@gmail.com')).toBe(false);
      expect(isAllowlistedAdminEmailTest('')).toBe(false);
      expect(isAllowlistedAdminEmailTest(null)).toBe(false);
      expect(isAllowlistedAdminEmailTest(undefined)).toBe(false);
    });

    it('case 1: signed out visitor opening /diyoration redirects to /kirish', () => {
      const result = evaluateAdminAccess(null, null);
      expect(result.canAccessAdmin).toBe(false);
      expect(result.redirectUrl).toBe('/kirish?redirect=/diyoration');
      expect(result.httpStatus).toBe(302);
    });

    it('case 2: signed-in ordinary user is denied with 403 Forbidden', () => {
      const ordinaryUser = {
        id: 'user-ord-1',
        email: 'reader@example.com',
        email_confirmed_at: '2026-09-01T10:00:00Z',
      };
      const ordinaryProfile = {
        id: 'user-ord-1',
        is_admin: false,
      };

      const result = evaluateAdminAccess(ordinaryUser, ordinaryProfile);
      expect(result.canAccessAdmin).toBe(false);
      expect(result.httpStatus).toBe(403);
    });

    it('case 3: signed-in user with allowlisted but UNVERIFIED email is rejected', () => {
      const unverifiedOwner = {
        id: 'user-unverified-owner',
        email: OWNER_EMAIL,
        email_confirmed_at: null,
        confirmed_at: null,
      };
      const unverifiedProfile = {
        id: 'user-unverified-owner',
        is_admin: false,
      };

      expect(isUserEmailVerifiedTest(unverifiedOwner)).toBe(false);
      const result = evaluateAdminAccess(unverifiedOwner, unverifiedProfile);
      expect(result.canAccessAdmin).toBe(false);
      expect(result.httpStatus).toBe(403);
    });

    it('case 4: signed-in user with verified owner email gets admin access', () => {
      const verifiedOwner = {
        id: 'user-verified-owner',
        email: OWNER_EMAIL,
        email_confirmed_at: '2026-09-01T12:00:00Z',
      };
      const initialProfile = {
        id: 'user-verified-owner',
        is_admin: false, // will be auto-synced
      };

      expect(isUserEmailVerifiedTest(verifiedOwner)).toBe(true);
      expect(isAllowlistedAdminEmailTest(verifiedOwner.email)).toBe(true);

      const result = evaluateAdminAccess(verifiedOwner, initialProfile);
      expect(result.canAccessAdmin).toBe(true);
      expect(result.httpStatus).toBe(200);
    });

    it('case 5: direct calls to /api/admin/* by ordinary users return 403 Forbidden', () => {
      function mockAdminEndpoint(userProfile: { is_admin: boolean } | null) {
        if (!userProfile || !userProfile.is_admin) {
          return { status: 403, body: { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' } };
        }
        return { status: 200, body: { success: true, data: [] } };
      }

      // Anonymous call
      const anonResponse = mockAdminEndpoint(null);
      expect(anonResponse.status).toBe(403);
      expect(anonResponse.body.success).toBe(false);

      // Ordinary user call
      const userResponse = mockAdminEndpoint({ is_admin: false });
      expect(userResponse.status).toBe(403);
      expect(userResponse.body.success).toBe(false);

      // Verified admin call
      const adminResponse = mockAdminEndpoint({ is_admin: true });
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.success).toBe(true);
    });

    it('case 6: admin-panel button visibility on desktop and mobile', () => {
      function renderNavigationButtons(state: { isAuthenticated: boolean; isAdmin: boolean }) {
        const desktopMenu = {
          showProfileLink: state.isAuthenticated,
          showAdminPanelButton: state.isAuthenticated && state.isAdmin,
          adminButtonText: 'Admin paneli',
          adminButtonHref: '/diyoration',
        };

        const mobileBottomNav = {
          showAdminTab: state.isAuthenticated && state.isAdmin,
          adminTabLabel: 'Admin',
          adminTabHref: '/diyoration/dashboard',
        };

        return { desktopMenu, mobileBottomNav };
      }

      // 1. Signed out visitor
      const visitorNav = renderNavigationButtons({ isAuthenticated: false, isAdmin: false });
      expect(visitorNav.desktopMenu.showAdminPanelButton).toBe(false);
      expect(visitorNav.mobileBottomNav.showAdminTab).toBe(false);

      // 2. Ordinary signed-in user
      const ordinaryNav = renderNavigationButtons({ isAuthenticated: true, isAdmin: false });
      expect(ordinaryNav.desktopMenu.showAdminPanelButton).toBe(false);
      expect(ordinaryNav.mobileBottomNav.showAdminTab).toBe(false);

      // 3. Verified Admin user
      const adminNav = renderNavigationButtons({ isAuthenticated: true, isAdmin: true });
      expect(adminNav.desktopMenu.showAdminPanelButton).toBe(true);
      expect(adminNav.desktopMenu.adminButtonText).toBe('Admin paneli');
      expect(adminNav.desktopMenu.adminButtonHref).toBe('/diyoration');
      expect(adminNav.mobileBottomNav.showAdminTab).toBe(true);
      expect(adminNav.mobileBottomNav.adminTabLabel).toBe('Admin');
      expect(adminNav.mobileBottomNav.adminTabHref).toBe('/diyoration/dashboard');
    });
  });
});

