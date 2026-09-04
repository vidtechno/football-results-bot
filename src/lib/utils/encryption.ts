import crypto from 'node:crypto';

/**
 * Server-side bank card encryption and validation module for Manbora.
 * Uses AES-256-GCM authenticated encryption.
 * The encryption key must be configured in CARD_ENCRYPTION_KEY environment variable.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // Standard 128 bits for GCM

function getEncryptionKey(): Buffer {
  const envKey = process.env.CARD_ENCRYPTION_KEY;
  if (!envKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CARD_ENCRYPTION_KEY muhit o‘zgaruvchisi o‘rnatilmagan!');
    }
    // Fallback deterministic test key for non-production environments
    return crypto.createHash('sha256').update('manbora_default_card_dev_secret_key_change_in_prod').digest();
  }

  // If 64-character hex string, parse directly
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }

  // Otherwise hash to ensure exact 32 bytes
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Validates Uzbek bank card numbers:
 * - Uzcard: 8600
 * - Humo: 9860
 * - Visa: 4...
 * - Mastercard: 51.. - 55..
 * - UnionPay: 62..
 * Must be exactly 16 digits.
 */
export function isValidUzbekCardNumber(cardNumber: string): boolean {
  const clean = cardNumber.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(clean)) {
    return false;
  }

  const prefix2 = clean.slice(0, 2);
  const prefix4 = clean.slice(0, 4);

  // Uzcard (8600), Humo (9860)
  if (prefix4 === '8600' || prefix4 === '9860') {
    return true;
  }

  // Visa (4xxx)
  if (clean.startsWith('4')) {
    return true;
  }

  // Mastercard (51xx - 55xx)
  const p2Num = Number.parseInt(prefix2, 10);
  if (p2Num >= 51 && p2Num <= 55) {
    return true;
  }

  // UnionPay (62xx)
  if (prefix2 === '62') {
    return true;
  }

  // Other valid 16-digit cards
  return true;
}

/**
 * Encrypts bank card number using AES-256-GCM.
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encryptCardData(plainTextCard: string): string {
  const clean = plainTextCard.replace(/\s+/g, '');
  if (!clean || clean.length < 16) {
    throw new Error('Noto‘g‘ri karta raqami');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(clean, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine iv (12) + authTag (16) + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts bank card ciphertext. Only executable in authorized server context.
 */
export function decryptCardData(encryptedPayload: string): string {
  if (!encryptedPayload) {
    throw new Error('Shifrlangan karta ma‘lumoti mavjud emas');
  }

  const key = getEncryptionKey();
  const buffer = Buffer.from(encryptedPayload, 'base64');

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Noto‘g‘ri shifrlangan ma‘lumot formati');
  }

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
