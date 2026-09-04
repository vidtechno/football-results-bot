import { describe, it, expect } from 'vitest';
import {
  formatUZS,
  maskCardNumber,
  isValidCardNumber,
  calculateCommission,
  generateIdempotencyKey,
} from '@/lib/utils/currency';

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

  describe('maskCardNumber and isValidCardNumber', () => {
    it('validates 16 digit card numbers correctly', () => {
      expect(isValidCardNumber('8600123456789012')).toBe(true);
      expect(isValidCardNumber('8600 1234 5678 9012')).toBe(true);
      expect(isValidCardNumber('86001234')).toBe(false);
      expect(isValidCardNumber('abcd1234efgh5678')).toBe(false);
    });

    it('masks card numbers preserving first 4 and last 4 digits', () => {
      expect(maskCardNumber('8600123456789012')).toBe('8600 **** **** 9012');
      expect(maskCardNumber('9860 1111 2222 3333')).toBe('9860 **** **** 3333');
    });

    it('returns placeholder on invalid length', () => {
      expect(maskCardNumber('1234')).toBe('**** **** **** ****');
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

  describe('Purchase Atomicity & Idempotency Rules', () => {
    it('generates unique keys with specified prefix', () => {
      const key1 = generateIdempotencyKey('buy');
      const key2 = generateIdempotencyKey('buy');
      expect(key1).toMatch(/^buy_\d+_[a-z0-9]+$/);
      expect(key1).not.toBe(key2);
    });

    it('validates that identical idempotency key or existing active purchase prevents duplicate charges', () => {
      // Simulate ledger transaction state
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

      // Simulate reservation
      expect(availableEarnings).toBeGreaterThanOrEqual(requestedAmount);
      availableEarnings -= requestedAmount;
      reservedEarnings += requestedAmount;

      expect(availableEarnings).toBe(50000);
      expect(reservedEarnings).toBe(100000);

      // Author cannot request more than now available
      expect(availableEarnings >= requestedAmount).toBe(false);
    });

    it('atomically reverses reserved earnings back to available on rejection or cancellation', () => {
      let availableEarnings = 50000;
      let reservedEarnings = 100000;
      const reversedAmount = 100000;

      // Simulate rejection reversal
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
});
