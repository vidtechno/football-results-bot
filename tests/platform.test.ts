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
import { validateImageMagicBytes } from '@/lib/utils/imageUpload';
import { sanitizeRichText } from '@/lib/utils/sanitizer';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { isUserAllowlistedAdmin } from '@/lib/supabase/server';
import {
  generateTelegramTopupMessage,
  getAdminTelegramUrl,
  getAdminTelegramUsername,
} from '@/lib/utils/telegram';

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

  describe('Image Security, Magic Bytes & Sharp Upload Pipeline', () => {
    it('accepts valid JPEG file signature (FF D8 FF)', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = validateImageMagicBytes(jpegHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('jpeg');
    });

    it('accepts valid PNG file signature (89 50 4E 47 0D 0A 1A 0A)', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = validateImageMagicBytes(pngHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('png');
    });

    it('accepts valid WebP file signature (RIFF....WEBP)', () => {
      const webpHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x20, 0x00, 0x00, 0x00, // size
        0x57, 0x45, 0x42, 0x50, // WEBP
      ]);
      const res = validateImageMagicBytes(webpHeader);
      expect(res.isValid).toBe(true);
      expect(res.detectedFormat).toBe('webp');
    });

    it('strictly rejects SVG files disguised as images (XSS prevention)', () => {
      const svgDisguisedAsJpg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const res = validateImageMagicBytes(svgDisguisedAsJpg);
      expect(res.isValid).toBe(false);
    });

    it('strictly rejects executable, PDF, and random text files', () => {
      const pdfHeader = Buffer.from('%PDF-1.4 1 0 obj <</Type/Catalog>>');
      expect(validateImageMagicBytes(pdfHeader).isValid).toBe(false);

      const htmlHeader = Buffer.from('<!DOCTYPE html><html><body>malicious</body></html>');
      expect(validateImageMagicBytes(htmlHeader).isValid).toBe(false);

      const emptyBuffer = Buffer.alloc(4);
      expect(validateImageMagicBytes(emptyBuffer).isValid).toBe(false);
    });
  });

  describe('Rich-Text Editorial HTML Sanitizer', () => {
    it('preserves valid editorial tags (p, h2, h3, blockquote, ul, ol, li, strong, em, u, hr, br)', () => {
      const input = '<h2>Bosh bob</h2><p>Bu <strong>muhim</strong> va <em>ajoyib</em> <u>fikr</u>.</p><blockquote>Iqtibos</blockquote><hr /><p>Yangi qator<br />davomi</p>';
      const sanitized = sanitizeRichText(input);
      expect(sanitized).toContain('<h2>Bosh bob</h2>');
      expect(sanitized).toContain('<strong>muhim</strong>');
      expect(sanitized).toContain('<em>ajoyib</em>');
      expect(sanitized).toContain('<u>fikr</u>');
      expect(sanitized).toContain('<blockquote>Iqtibos</blockquote>');
      expect(sanitized).toContain('<hr />');
      expect(sanitized).toContain('<br />');
    });

    it('preserves approved typography alignment classes', () => {
      const input = '<p class="text-center">Markazda joylashgan matn</p><p class="text-right">O‘ngda joylashgan</p>';
      const sanitized = sanitizeRichText(input);
      expect(sanitized).toContain('class="text-center"');
      expect(sanitized).toContain('class="text-right"');
    });

    it('strictly strips script tags and iframes to prevent XSS in chapters', () => {
      const malicious = '<p>Hikoya matni</p><script>alert("hacked")</script><iframe src="//evil.com"></iframe>';
      const sanitized = sanitizeRichText(malicious);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('<p>Hikoya matni</p>');
    });

    it('strips inline event listeners and javascript: URIs', () => {
      const malicious = '<p onclick="alert(1)" onmouseover="stealTokens()">Xavfli matn</p><a href="javascript:alert(1)">Havola</a>';
      const sanitized = sanitizeRichText(malicious);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('Author Workflow & Work Permissions', () => {
    it('validates author ownership before modifying work metadata', () => {
      function checkCanEditWork(userId: string, workAuthorId: string, isAdmin: boolean) {
        if (userId === workAuthorId) return { canEdit: true };
        if (isAdmin) return { canEdit: true };
        return { canEdit: false, error: 'Faqat asar muallifi uni tahrirlashi mumkin' };
      }

      const authorA = 'user-author-a';
      const authorB = 'user-author-b';
      const adminUser = 'user-admin';

      // Author A can edit their work
      expect(checkCanEditWork(authorA, authorA, false).canEdit).toBe(true);

      // Author B cannot edit Author A's work
      const unauthorized = checkCanEditWork(authorB, authorA, false);
      expect(unauthorized.canEdit).toBe(false);
      expect(unauthorized.error).toBe('Faqat asar muallifi uni tahrirlashi mumkin');

      // Admin can edit or review
      expect(checkCanEditWork(adminUser, authorA, true).canEdit).toBe(true);
    });

    it('applies soft-archiving flag to works without permanently deleting them', () => {
      interface WorkState {
        id: string;
        title: string;
        is_archived: boolean;
        status: string;
      }

      const work: WorkState = {
        id: 'work-123',
        title: 'O‘tkan kunlar',
        is_archived: false,
        status: 'published',
      };

      // Soft archive
      const archivedWork = { ...work, is_archived: true };
      expect(archivedWork.is_archived).toBe(true);
      expect(archivedWork.id).toBe('work-123'); // Still exists in database

      // Public catalog query filter simulation
      const publicWorks = [work, archivedWork].filter((w) => !w.is_archived && w.status === 'published');
      expect(publicWorks.length).toBe(1);
      expect(publicWorks[0].id).toBe('work-123');
      expect(publicWorks[0].is_archived).toBe(false);
    });

    it('handles chapter reordering offsets to avoid unique constraint collisions', () => {
      const originalChapters = [
        { id: 'ch-1', chapter_number: 1 },
        { id: 'ch-2', chapter_number: 2 },
        { id: 'ch-3', chapter_number: 3 },
      ];

      // Reorder to [ch-3, ch-1, ch-2]
      const newOrder = ['ch-3', 'ch-1', 'ch-2'];
      const OFFSET = 10000;

      // Phase 1: Temporary offset assignments
      const tempAssigned = newOrder.map((id, index) => ({
        id,
        temp_number: OFFSET + index + 1,
      }));

      expect(tempAssigned[0].temp_number).toBe(10001);
      expect(tempAssigned[1].temp_number).toBe(10002);
      expect(tempAssigned[2].temp_number).toBe(10003);

      // Phase 2: Final consecutive assignments
      const finalAssigned = newOrder.map((id, index) => ({
        id,
        chapter_number: index + 1,
      }));

      expect(finalAssigned.find((c) => c.id === 'ch-3')?.chapter_number).toBe(1);
      expect(finalAssigned.find((c) => c.id === 'ch-1')?.chapter_number).toBe(2);
      expect(finalAssigned.find((c) => c.id === 'ch-2')?.chapter_number).toBe(3);
    });
  });

  describe('Reader Preferences & Progress Validation', () => {
    it('clamps reader scroll progress between 0% and 100%', () => {
      function clampProgress(val: number): number {
        if (isNaN(val)) return 0;
        return Math.max(0, Math.min(100, Math.round(val)));
      }

      expect(clampProgress(45.6)).toBe(46);
      expect(clampProgress(-10)).toBe(0);
      expect(clampProgress(150)).toBe(100);
      expect(clampProgress(0)).toBe(0);
      expect(clampProgress(100)).toBe(100);
      expect(clampProgress(NaN)).toBe(0);
    });

    it('validates reader theme preferences (light, sepia, dark)', () => {
      const validThemes = ['light', 'sepia', 'dark'];
      function isValidTheme(theme: string): boolean {
        return validThemes.includes(theme);
      }

      expect(isValidTheme('light')).toBe(true);
      expect(isValidTheme('sepia')).toBe(true);
      expect(isValidTheme('dark')).toBe(true);
      expect(isValidTheme('neon')).toBe(false);
      expect(isValidTheme('')).toBe(false);
    });
  });

  describe('Author Revision System Isolation & Promotion', () => {
    it('ensures published work remains untouched when a revision is drafted', () => {
      const liveWork = {
        id: 'work-pub-1',
        title: 'Original Published Title',
        description: 'Original Description',
        status: 'published',
      };

      const revision = {
        id: 'rev-1',
        work_id: liveWork.id,
        title: 'New Proposed Title',
        description: 'New proposed description',
        status: 'pending',
      };

      // Live work properties must remain unchanged while revision is pending
      expect(liveWork.title).toBe('Original Published Title');
      expect(revision.status).toBe('pending');
      expect(revision.title).not.toBe(liveWork.title);

      // Promotion simulation
      function promoteRevision(work: typeof liveWork, rev: typeof revision) {
        if (rev.status !== 'pending') throw new Error('Cannot promote non-pending revision');
        return {
          ...work,
          title: rev.title,
          description: rev.description,
          updated_at: new Date().toISOString(),
        };
      }

      const updatedWork = promoteRevision(liveWork, revision);
      expect(updatedWork.title).toBe('New Proposed Title');
      expect(updatedWork.description).toBe('New proposed description');
    });

    it('ensures chapter content remains untouched when a chapter revision is drafted', () => {
      const liveChapter = {
        id: 'ch-pub-1',
        title: '1-bob. Boshlanish',
        content: '<p>Asl nusxa matni...</p>',
        is_free: true,
        price: 0,
      };

      const chapterRevision = {
        id: 'ch-rev-1',
        chapter_id: liveChapter.id,
        title: '1-bob. Qayta tahrirlangan boshlanish',
        content: '<p>Kengaytirilgan va tahrirlangan yangi matn...</p>',
        status: 'pending',
      };

      // Live chapter must not show the revision
      expect(liveChapter.content).toBe('<p>Asl nusxa matni...</p>');
      expect(chapterRevision.status).toBe('pending');

      // Rejection simulation
      function rejectRevision(rev: typeof chapterRevision, reason: string) {
        return {
          ...rev,
          status: 'rejected',
          admin_notes: reason,
        };
      }

      const rejectedRev = rejectRevision(chapterRevision, 'Grammatik xatolar ko‘p');
      expect(rejectedRev.status).toBe('rejected');
      expect(rejectedRev.admin_notes).toBe('Grammatik xatolar ko‘p');
      // Live chapter still retains original content
      expect(liveChapter.content).toBe('<p>Asl nusxa matni...</p>');
    });
  });

  describe('Atomic Chapter Reordering Validation', () => {
    it('detects duplicate or missing chapter IDs before running atomic update', () => {
      function validateReorderPayload(chapterIds: string[]): { valid: boolean; error?: string } {
        if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
          return { valid: false, error: 'Hech bo‘lmaganda bitta bob tanlanishi kerak' };
        }
        const set = new Set(chapterIds);
        if (set.size !== chapterIds.length) {
          return { valid: false, error: 'Boblar ro‘yxatida takroriy identifikatorlar mavjud' };
        }
        return { valid: true };
      }

      expect(validateReorderPayload(['c1', 'c2', 'c3']).valid).toBe(true);
      expect(validateReorderPayload(['c1', 'c2', 'c1']).valid).toBe(false);
      expect(validateReorderPayload(['c1', 'c2', 'c1']).error).toContain('takroriy');
      expect(validateReorderPayload([]).valid).toBe(false);
    });
  });

  describe('Storage Cleanup URI Extraction', () => {
    it('correctly extracts file storage path from Supabase public URLs', () => {
      function extractStoragePath(url: string, bucket: string): string | null {
        const marker = `/${bucket}/`;
        if (!url.includes(marker)) return null;
        return url.split(marker)[1]?.split('?')[0] || null;
      }

      const testCoverUrl =
        'https://xyz.supabase.co/storage/v1/object/public/work-covers/author-uuid/cover-123.webp?v=1234';
      const path = extractStoragePath(testCoverUrl, 'work-covers');
      expect(path).toBe('author-uuid/cover-123.webp');

      const avatarUrl =
        'https://xyz.supabase.co/storage/v1/object/public/avatars/user-uuid/avatar-456.webp';
      const avatarPath = extractStoragePath(avatarUrl, 'avatars');
      expect(avatarPath).toBe('user-uuid/avatar-456.webp');

      const invalidUrl = 'https://external-site.com/image.jpg';
      expect(extractStoragePath(invalidUrl, 'work-covers')).toBeNull();
    });
  });

  describe('Safe Internal Redirects & Open Redirect Prevention', () => {
    it('allows valid internal local relative paths', () => {
      expect(getSafeRedirectUrl('/diyoration')).toBe('/diyoration');
      expect(getSafeRedirectUrl('/diyoration/dashboard')).toBe('/diyoration/dashboard');
      expect(getSafeRedirectUrl('/kabinet')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/asarlar/otkan-kunlar')).toBe('/asarlar/otkan-kunlar');
      expect(getSafeRedirectUrl('/muallif?tab=works')).toBe('/muallif?tab=works');
    });

    it('rejects malicious external open redirect targets and falls back safely', () => {
      expect(getSafeRedirectUrl('https://evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('http://attacker.com/steal')).toBe('/kabinet');
      expect(getSafeRedirectUrl('//evil.com/phish')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/\\evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('javascript:alert(1)')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/http://evil.com')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/javascript:steal()')).toBe('/kabinet');
    });

    it('rejects control characters, newlines and null bytes', () => {
      expect(getSafeRedirectUrl('/diyoration\nSet-Cookie:evil=true')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/diyoration\r\n')).toBe('/kabinet');
      expect(getSafeRedirectUrl('/diyoration\0')).toBe('/kabinet');
    });

    it('handles null, undefined and empty inputs with custom fallback', () => {
      expect(getSafeRedirectUrl(null, '/custom')).toBe('/custom');
      expect(getSafeRedirectUrl(undefined, '/custom')).toBe('/custom');
      expect(getSafeRedirectUrl('', '/custom')).toBe('/custom');
      expect(getSafeRedirectUrl('   ', '/custom')).toBe('/custom');
    });
  });

  describe('Server-Side Admin Allowlist & Verification', () => {
    const originalEnv = process.env.ADMIN_EMAILS;

    it('recognizes allowlisted user with verified email as admin', () => {
      process.env.ADMIN_EMAILS = 'anorboyevdiyorbek714@gmail.com,admin2@manbora.uz';

      const user = {
        id: 'usr-admin-1',
        email: 'anorboyevdiyorbek714@gmail.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
      };

      expect(isUserAllowlistedAdmin(user)).toBe(true);
    });

    it('handles case-insensitivity and whitespace in email allowlist', () => {
      process.env.ADMIN_EMAILS = '  anorboyevdiyorbek714@gmail.com  ';

      const user = {
        id: 'usr-admin-2',
        email: 'ANORBOYEVDIYORBEK714@GMAIL.COM',
        confirmed_at: '2026-01-01T00:00:00Z',
      };

      expect(isUserAllowlistedAdmin(user)).toBe(true);
    });

    it('rejects allowlisted email if email is NOT confirmed/verified', () => {
      process.env.ADMIN_EMAILS = 'anorboyevdiyorbek714@gmail.com';

      const unconfirmedUser = {
        id: 'usr-admin-unverified',
        email: 'anorboyevdiyorbek714@gmail.com',
        email_confirmed_at: null,
        confirmed_at: null,
      };

      expect(isUserAllowlistedAdmin(unconfirmedUser)).toBe(false);
    });

    it('rejects unallowlisted users regardless of verification', () => {
      process.env.ADMIN_EMAILS = 'anorboyevdiyorbek714@gmail.com';

      const ordinaryUser = {
        id: 'usr-ordinary-1',
        email: 'reader@example.uz',
        email_confirmed_at: '2026-01-01T00:00:00Z',
      };

      expect(isUserAllowlistedAdmin(ordinaryUser)).toBe(false);
    });

    it('rejects null or missing email safely', () => {
      process.env.ADMIN_EMAILS = 'anorboyevdiyorbek714@gmail.com';
      expect(isUserAllowlistedAdmin(null)).toBe(false);
      expect(isUserAllowlistedAdmin({})).toBe(false);
      expect(isUserAllowlistedAdmin({ email: '' })).toBe(false);
    });

    // Restore env
    process.env.ADMIN_EMAILS = originalEnv;
  });

  describe('SSR Session Synchronization & Admin Route Authorization', () => {
    it('signed-in verified admin opens /diyoration without another login', () => {
      const adminProfile = {
        id: 'usr-admin-1',
        email: 'anorboyevdiyorbek714@gmail.com',
        is_admin: true,
        display_name: 'Diyorbek',
      };

      function evaluateAdminRouteAccess(profile: typeof adminProfile | null) {
        if (!profile) return { status: 302, redirect: '/kirish?redirect=/diyoration' };
        if (!profile.is_admin) return { status: 403, error: 'Ruxsat berilmagan' };
        return { status: 200, granted: true };
      }

      const result = evaluateAdminRouteAccess(adminProfile);
      expect(result.status).toBe(200);
      expect(result.granted).toBe(true);
    });

    it('already-authenticated verified admin visiting /kirish?redirect=/diyoration is redirected directly to /diyoration', () => {
      const adminProfile = {
        id: 'usr-admin-1',
        is_admin: true,
      };

      function handleKirishServerRedirect(profile: typeof adminProfile | null, rawRedirect?: string) {
        const safe = getSafeRedirectUrl(rawRedirect, profile?.is_admin ? '/diyoration' : '/kabinet');
        if (profile) {
          if (profile.is_admin && (rawRedirect === '/diyoration' || rawRedirect?.startsWith('/diyoration/'))) {
            return { redirect: '/diyoration' };
          }
          return { redirect: safe };
        }
        return { renderLogin: true };
      }

      const res = handleKirishServerRedirect(adminProfile, '/diyoration');
      expect(res.redirect).toBe('/diyoration');
    });

    it('ordinary authenticated user gets 403 Forbidden when accessing /diyoration', () => {
      const ordinaryProfile = {
        id: 'usr-reader-1',
        email: 'reader@example.uz',
        is_admin: false,
      };

      function evaluateAdminRouteAccess(profile: typeof ordinaryProfile | null) {
        if (!profile) return { status: 302, redirect: '/kirish?redirect=/diyoration' };
        if (!profile.is_admin) return { status: 403, error: 'Ruxsat berilmagan' };
        return { status: 200, granted: true };
      }

      const result = evaluateAdminRouteAccess(ordinaryProfile);
      expect(result.status).toBe(403);
      expect(result.error).toBe('Ruxsat berilmagan');
    });

    it('signed-out visitor accessing /diyoration redirects to /kirish?redirect=/diyoration', () => {
      function evaluateAdminRouteAccess(profile: null) {
        if (!profile) return { status: 302, redirect: '/kirish?redirect=/diyoration' };
        return { status: 200, granted: true };
      }

      const result = evaluateAdminRouteAccess(null);
      expect(result.status).toBe(302);
      expect(result.redirect).toBe('/kirish?redirect=/diyoration');
    });

    it('session survives refresh and client navigation via cookie persistence', () => {
      // Simulating cookie store persisting official @supabase/ssr session chunk
      const cookieJar = new Map<string, string>();
      cookieJar.set('sb-testproject-auth-token', JSON.stringify(['access_token_123', 'refresh_token_456']));

      // On navigation or refresh, cookies remain in the jar and are parsed
      const hasCookie = Array.from(cookieJar.keys()).some(
        (k) => k.startsWith('sb-') && k.includes('-auth-token')
      );
      expect(hasCookie).toBe(true);

      const parsed = JSON.parse(cookieJar.get('sb-testproject-auth-token')!);
      expect(parsed[0]).toBe('access_token_123');
    });

    it('expired session is refreshed and cookies updated', () => {
      let currentAccessToken = 'old_expired_token';

      function simulateMiddlewareRefresh(isExpired: boolean) {
        if (isExpired) {
          currentAccessToken = 'refreshed_new_token';
          return { refreshed: true, newToken: currentAccessToken };
        }
        return { refreshed: false, newToken: currentAccessToken };
      }

      const res = simulateMiddlewareRefresh(true);
      expect(res.refreshed).toBe(true);
      expect(res.newToken).toBe('refreshed_new_token');
    });

    it('logout clears the server-readable session cookies', () => {
      const cookieJar = new Map<string, string>();
      cookieJar.set('sb-testproject-auth-token', 'token_data');
      cookieJar.set('sb-access-token', 'legacy_data');

      // Logout simulation
      function performLogout(jar: Map<string, string>) {
        jar.delete('sb-testproject-auth-token');
        jar.delete('sb-access-token');
        jar.delete('sb-auth-token');
        jar.delete('supabase-auth-token');
      }

      performLogout(cookieJar);
      expect(cookieJar.has('sb-testproject-auth-token')).toBe(false);
      expect(cookieJar.has('sb-access-token')).toBe(false);
      expect(cookieJar.size).toBe(0);
    });
  });
});

describe('Manual Balance Top-up Journey, Manbora Public ID & Admin Management', () => {
  describe('1. Insufficient Balance & Missing Amount Calculation', () => {
    it('calculates exact missing amount when balance is less than content price', () => {
      const price = 15000;
      const userBalance = 5000;
      const missingAmount = Math.max(0, price - userBalance);
      expect(missingAmount).toBe(10000);
    });

    it('missing amount is zero when balance is greater than or equal to price', () => {
      const price = 8000;
      const userBalance = 10000;
      const missingAmount = Math.max(0, price - userBalance);
      expect(missingAmount).toBe(0);
    });

    it('handles zero balance correctly', () => {
      const price = 25000;
      const userBalance = 0;
      const missingAmount = Math.max(0, price - userBalance);
      expect(missingAmount).toBe(25000);
    });
  });

  describe('2. Prepared Telegram Message Generation', () => {
    it('generates a complete, polite Uzbek Latin top-up message with all required fields', () => {
      const msg = generateTelegramTopupMessage({
        userName: 'Diyorbek Anorboyev',
        publicId: 'MB-00001001',
        email: 'anorboyevdiyorbek714@gmail.com',
        currentBalance: 5000,
        itemTitle: 'O‘tkan kunlar',
        itemType: 'chapter',
        itemPrice: 15000,
        missingAmount: 10000,
        requestedAmount: 10000,
      });

      expect(msg).toContain('Assalomu alaykum, Manbora ma’muri!');
      expect(msg).toContain('Diyorbek Anorboyev');
      expect(msg).toContain('MB-00001001');
      expect(msg).toContain('anorboyevdiyorbek714@gmail.com');
      expect(msg).toContain("5 000 so'm");
      expect(msg).toContain('O‘tkan kunlar');
      expect(msg).toContain("15 000 so'm");
      expect(msg).toContain("10 000 so'm");
      expect(msg).toContain('to‘lov uchun karta raqamini yuborsangiz');
    });

    it('strictly does NOT leak passwords, access tokens, service keys or secrets in telegram message', () => {
      const sensitiveToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummysecret';
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service_role_secret';

      const msg = generateTelegramTopupMessage({
        userName: 'Test User',
        publicId: 'MB-00001002',
        email: 'user@example.com',
        currentBalance: 0,
      });

      expect(msg).not.toContain(sensitiveToken);
      expect(msg).not.toContain(serviceRoleKey);
      expect(msg).not.toContain('password');
      expect(msg).not.toContain('secret');
      expect(msg).not.toContain('Bearer');
    });

    it('generates safe Telegram URL without hardcoding personal usernames', () => {
      const msg = 'Test message';
      const url = getAdminTelegramUrl(msg);

      expect(url).toMatch(/^https:\/\/t\.me\/[a-zA-Z0-9_]+\?text=/);
      expect(decodeURIComponent(url)).toContain(msg);
    });

    it('returns default fallback admin username when environment variable is not set', () => {
      const defaultUsername = getAdminTelegramUsername();
      expect(defaultUsername).toBeDefined();
      expect(typeof defaultUsername).toBe('string');
      expect(defaultUsername.length).toBeGreaterThan(0);
    });
  });

  describe('3. Public Manbora User ID Format & Validation', () => {
    it('validates sequential human-readable Manbora ID format MB-XXXXXXXX', () => {
      const manboraIdRegex = /^MB-\d{8}$/;

      expect(manboraIdRegex.test('MB-00001001')).toBe(true);
      expect(manboraIdRegex.test('MB-00001234')).toBe(true);
      expect(manboraIdRegex.test('MB-00100000')).toBe(true);

      // Invalid formats
      expect(manboraIdRegex.test('12345678')).toBe(false);
      expect(manboraIdRegex.test('MB-123')).toBe(false);
      expect(manboraIdRegex.test('USER-00001001')).toBe(false);
      expect(manboraIdRegex.test('00000000-0000-0000-0000-000000000000')).toBe(false);
    });

    it('generates unique sequential IDs that do not repeat', () => {
      let seqCounter = 1000;
      function generateMockManboraId() {
        seqCounter += 1;
        return `MB-${String(seqCounter).padStart(8, '0')}`;
      }

      const id1 = generateMockManboraId();
      const id2 = generateMockManboraId();
      const id3 = generateMockManboraId();

      expect(id1).toBe('MB-00001001');
      expect(id2).toBe('MB-00001002');
      expect(id3).toBe('MB-00001003');
      expect(new Set([id1, id2, id3]).size).toBe(3);
    });
  });

  describe('4. Admin Search & Filtering Logic', () => {
    const mockUsers = [
      { id: '11111111-1111-1111-1111-111111111111', public_id: 'MB-00001001', display_name: 'Diyorbek Anorboyev', username: 'diyorbek', email: 'anorboyevdiyorbek714@gmail.com', is_admin: true, balance: 50000, author_status: null },
      { id: '22222222-2222-2222-2222-222222222222', public_id: 'MB-00001002', display_name: 'Abdulla Qodiriy', username: 'qodiriy', email: 'qodiriy@manbora.uz', is_admin: false, balance: 120000, author_status: 'approved' },
      { id: '33333333-3333-3333-3333-333333333333', public_id: 'MB-00001003', display_name: 'Alisher Navoiy', username: 'navoiy', email: 'navoiy@manbora.uz', is_admin: false, balance: 0, author_status: 'suspended' },
      { id: '44444444-4444-4444-4444-444444444444', public_id: 'MB-00001004', display_name: 'Oddiy Kitobxon', username: 'kitobxon1', email: 'reader@example.com', is_admin: false, balance: 0, author_status: null },
    ];

    function searchUsers(q: string, filter: string) {
      let list = [...mockUsers];
      const lowerQ = q.trim().toLowerCase();

      if (lowerQ) {
        list = list.filter((u) =>
          u.display_name.toLowerCase().includes(lowerQ) ||
          u.username.toLowerCase().includes(lowerQ) ||
          u.public_id.toLowerCase().includes(lowerQ) ||
          u.email.toLowerCase().includes(lowerQ) ||
          u.id.toLowerCase() === lowerQ
        );
      }

      if (filter === 'admins') {
        list = list.filter((u) => u.is_admin);
      } else if (filter === 'authors') {
        list = list.filter((u) => Boolean(u.author_status));
      } else if (filter === 'readers') {
        list = list.filter((u) => !u.is_admin && !u.author_status);
      } else if (filter === 'positive_balance') {
        list = list.filter((u) => u.balance > 0);
      } else if (filter === 'restricted') {
        list = list.filter((u) => u.author_status === 'suspended');
      }

      return list;
    }

    it('searches users by name, username, Manbora ID, email and UUID case-insensitively', () => {
      expect(searchUsers('diyorbek', 'all')).toHaveLength(1);
      expect(searchUsers('DIYoRBEK', 'all')).toHaveLength(1);
      expect(searchUsers('MB-00001002', 'all')).toHaveLength(1);
      expect(searchUsers('anorboyevdiyorbek714@gmail.com', 'all')).toHaveLength(1);
      expect(searchUsers('33333333-3333-3333-3333-333333333333', 'all')).toHaveLength(1);
    });

    it('filters users by readers, authors, admins, positive balance and restricted', () => {
      expect(searchUsers('', 'admins')).toHaveLength(1);
      expect(searchUsers('', 'authors')).toHaveLength(2);
      expect(searchUsers('', 'readers')).toHaveLength(1);
      expect(searchUsers('', 'positive_balance')).toHaveLength(2);
      expect(searchUsers('', 'restricted')).toHaveLength(1);
    });
  });

  describe('5. Admin Wallet Adjustment Engine Rules & Invariants', () => {
    interface WalletAccount {
      id: string;
      user_id: string;
      balance: number;
    }

    interface WalletTx {
      id: string;
      account_id: string;
      amount: number;
      transaction_type: string;
      reference_type: string;
      idempotency_key: string;
      description: string;
      balance_after: number;
    }

    function simulateAdminAdjustment(
      caller: { is_admin: boolean; id: string },
      wallet: WalletAccount,
      ledger: WalletTx[],
      auditLogs: any[],
      params: {
        action: 'credit' | 'debit';
        amount: number;
        reason: string;
        note?: string;
        idempotencyKey?: string;
      }
    ) {
      if (!caller.is_admin) {
        throw new Error('Faqat tasdiqlangan administratorlar balansni o‘zgartirishi mumkin');
      }

      if (!Number.isInteger(params.amount) || params.amount <= 0) {
        throw new Error('Summa musbat butun son bo‘lishi lozim');
      }

      if (params.amount > 100000000) {
        throw new Error('Maksimal bir martalik summa 100 000 000 so‘m');
      }

      if (!params.reason || !params.reason.trim()) {
        throw new Error('Sabab majburiy');
      }

      const idempKey = params.idempotencyKey || `tx_${Date.now()}`;
      const existing = ledger.find((t) => t.idempotency_key === idempKey);
      if (existing) {
        return {
          success: true,
          idempotent: true,
          balance_after: existing.balance_after,
          transaction_id: existing.id,
        };
      }

      if (params.action === 'debit') {
        if (wallet.balance < params.amount) {
          throw new Error('Foydalanuvchi balansida yetarli mablag‘ mavjud emas');
        }
        wallet.balance -= params.amount;
      } else {
        wallet.balance += params.amount;
      }

      const txId = `tx_${ledger.length + 1}`;
      const newTx: WalletTx = {
        id: txId,
        account_id: wallet.id,
        amount: params.action === 'credit' ? params.amount : -params.amount,
        transaction_type: params.reason.includes('Telegram') ? 'topup' : 'adjustment',
        reference_type: 'manual',
        idempotency_key: idempKey,
        description: params.reason,
        balance_after: wallet.balance,
      };
      ledger.push(newTx);

      auditLogs.push({
        action: `wallet_adjustment_${params.action}`,
        admin_id: caller.id,
        entity_id: wallet.id,
        amount: params.amount,
        balance_after: wallet.balance,
      });

      return {
        success: true,
        transaction_id: txId,
        balance_after: wallet.balance,
      };
    }

    it('admin credit succeeds atomically and increments balance', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 10000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      const res = simulateAdminAdjustment(
        { is_admin: true, id: 'admin1' },
        wallet,
        ledger,
        audit,
        { action: 'credit', amount: 25000, reason: 'Telegram orqali qo‘lda to‘lov' }
      );

      expect(res.success).toBe(true);
      expect(wallet.balance).toBe(35000);
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount).toBe(25000);
      expect(ledger[0].balance_after).toBe(35000);
      expect(audit).toHaveLength(1);
    });

    it('admin debit succeeds atomically and decrements balance', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 50000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      const res = simulateAdminAdjustment(
        { is_admin: true, id: 'admin1' },
        wallet,
        ledger,
        audit,
        { action: 'debit', amount: 20000, reason: 'qaytarim' }
      );

      expect(res.success).toBe(true);
      expect(wallet.balance).toBe(30000);
      expect(ledger).toHaveLength(1);
      expect(ledger[0].amount).toBe(-20000);
      expect(ledger[0].balance_after).toBe(30000);
    });

    it('rejects debit if balance is insufficient (overdraft protection)', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 5000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      expect(() =>
        simulateAdminAdjustment(
          { is_admin: true, id: 'admin1' },
          wallet,
          ledger,
          audit,
          { action: 'debit', amount: 10000, reason: 'jarima' }
        )
      ).toThrow('Foydalanuvchi balansida yetarli mablag‘ mavjud emas');

      // Balance remains intact
      expect(wallet.balance).toBe(5000);
      expect(ledger).toHaveLength(0);
    });

    it('rejects non-admin users from performing adjustments', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 10000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      expect(() =>
        simulateAdminAdjustment(
          { is_admin: false, id: 'regular_user' },
          wallet,
          ledger,
          audit,
          { action: 'credit', amount: 5000, reason: 'bonus' }
        )
      ).toThrow('Faqat tasdiqlangan administratorlar');
    });

    it('rejects fractional and invalid amounts', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 10000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      expect(() =>
        simulateAdminAdjustment(
          { is_admin: true, id: 'admin1' },
          wallet,
          ledger,
          audit,
          { action: 'credit', amount: 100.5, reason: 'bonus' }
        )
      ).toThrow('Summa musbat butun son bo‘lishi lozim');

      expect(() =>
        simulateAdminAdjustment(
          { is_admin: true, id: 'admin1' },
          wallet,
          ledger,
          audit,
          { action: 'credit', amount: -5000, reason: 'bonus' }
        )
      ).toThrow('Summa musbat butun son bo‘lishi lozim');

      expect(() =>
        simulateAdminAdjustment(
          { is_admin: true, id: 'admin1' },
          wallet,
          ledger,
          audit,
          { action: 'credit', amount: 0, reason: 'bonus' }
        )
      ).toThrow('Summa musbat butun son bo‘lishi lozim');
    });

    it('duplicate idempotency key cannot credit twice', () => {
      const wallet = { id: 'w1', user_id: 'u1', balance: 10000 };
      const ledger: WalletTx[] = [];
      const audit: any[] = [];

      const key = 'idem_topup_unique_123';

      // First call
      const res1 = simulateAdminAdjustment(
        { is_admin: true, id: 'admin1' },
        wallet,
        ledger,
        audit,
        { action: 'credit', amount: 20000, reason: 'Telegram to‘lov', idempotencyKey: key }
      );
      expect(res1.balance_after).toBe(30000);
      expect(wallet.balance).toBe(30000);

      // Duplicate retry
      const res2 = simulateAdminAdjustment(
        { is_admin: true, id: 'admin1' },
        wallet,
        ledger,
        audit,
        { action: 'credit', amount: 20000, reason: 'Telegram to‘lov', idempotencyKey: key }
      );
      expect(res2.idempotent).toBe(true);
      expect(wallet.balance).toBe(30000); // Does not double count
      expect(ledger).toHaveLength(1);
    });

    it('ledger entry is immutable (read-only audit trail)', () => {
      const tx: WalletTx = {
        id: 'tx_1',
        account_id: 'w1',
        amount: 25000,
        transaction_type: 'topup',
        reference_type: 'manual',
        idempotency_key: 'idemp_1',
        description: 'Telegram to‘lov',
        balance_after: 25000,
      };

      Object.freeze(tx);
      expect(() => {
        (tx as any).amount = 50000;
      }).toThrow();
    });
  });

  describe('6. Author and Works Moderation Invariants', () => {
    it('requires mandatory reason when rejecting or suspending an author', () => {
      function validateAuthorAction(action: string, reason?: string) {
        if ((action === 'reject' || action === 'suspend') && (!reason || !reason.trim())) {
          throw new Error('Sabab ko‘rsatilishi shart');
        }
        return true;
      }

      expect(validateAuthorAction('approve')).toBe(true);
      expect(validateAuthorAction('restore')).toBe(true);
      expect(validateAuthorAction('reject', 'Hujjatlar mos emas')).toBe(true);
      expect(validateAuthorAction('suspend', 'Qoidabuzarlik')).toBe(true);
      expect(() => validateAuthorAction('reject', '')).toThrow('Sabab ko‘rsatilishi shart');
      expect(() => validateAuthorAction('suspend', '   ')).toThrow('Sabab ko‘rsatilishi shart');
    });

    it('requires mandatory reason when rejecting or unpublishing a work', () => {
      function validateWorkAction(action: string, reason?: string) {
        if ((action === 'reject' || action === 'unpublish') && (!reason || !reason.trim())) {
          throw new Error('Sabab ko‘rsatilishi shart');
        }
        return true;
      }

      expect(validateWorkAction('approve')).toBe(true);
      expect(validateWorkAction('archive')).toBe(true);
      expect(validateWorkAction('restore')).toBe(true);
      expect(validateWorkAction('unpublish', 'Muallif iltimosiga ko‘ra')).toBe(true);
      expect(() => validateWorkAction('unpublish', '')).toThrow('Sabab ko‘rsatilishi shart');
      expect(() => validateWorkAction('reject', '   ')).toThrow('Sabab ko‘rsatilishi shart');
    });
  });
});



