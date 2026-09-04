/**
 * Currency and financial utilities for Manbora.
 * All financial amounts are represented as integer UZS (so'm).
 */

export function formatUZS(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "0 so'm";
  }

  const num = Math.round(Number(amount));
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} so'm`;
}

export function maskCardNumber(cardNumber: string): string {
  const clean = cardNumber.replace(/\s+/g, '');
  if (clean.length !== 16) {
    return '**** **** **** ****';
  }
  return `${clean.slice(0, 4)} **** **** ${clean.slice(12)}`;
}

export function isValidCardNumber(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\s+/g, '');
  return /^\d{16}$/.test(clean);
}

export function calculateCommission(
  grossAmount: number,
  commissionPercentage: number = 20,
): {
  grossAmount: number;
  commissionAmount: number;
  authorNetAmount: number;
} {
  const gross = Math.max(0, Math.floor(grossAmount));
  const commission = Math.floor((gross * commissionPercentage) / 100);
  const authorNet = gross - commission;

  return {
    grossAmount: gross,
    commissionAmount: commission,
    authorNetAmount: authorNet,
  };
}

export function generateIdempotencyKey(prefix: string = 'tx'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
