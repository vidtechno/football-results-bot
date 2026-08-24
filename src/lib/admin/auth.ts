import crypto from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'diyoration_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AdminSession {
  username: string;
  role: 'owner' | 'editor' | 'reviewer';
  expiresAt: number;
}

// In-memory rate limiting map for login attempts
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

/**
 * Check and record login attempt for rate-limiting (max 5 attempts per 15 minutes)
 */
export function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = loginAttempts.get(ip);

  if (!record) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (now - record.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= 5) {
    const remainingMs = windowMs - (now - record.firstAttempt);
    return { allowed: false, remainingMs };
  }

  record.count += 1;
  return { allowed: true };
}

/**
 * Reset rate limit counter on successful login
 */
export function clearRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * Hash password string using PBKDF2-SHA512
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';

  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return `pbkdf2$${iterations}$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verify plaintext password against stored hash string
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;

  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      // Direct string fallback comparison if hash not formatted
      return password === storedHash;
    }

    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512');
    const computedHash = derivedKey.toString('hex');

    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'fallback_diyoration_secret_key_84920491823901923';
}

/**
 * Create a signed HMAC-SHA256 session token
 */
export function createSessionToken(username: string, role: 'owner' | 'editor' | 'reviewer' = 'owner'): string {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload: AdminSession = { username, role, expiresAt };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const hmac = crypto.createHmac('sha256', getSessionSecret());
  hmac.update(payloadBase64);
  const signature = hmac.digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Verify signed session token and return session payload if valid
 */
export function verifySessionToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;

    const hmac = crypto.createHmac('sha256', getSessionSecret());
    hmac.update(payloadBase64);
    const expectedSignature = hmac.digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const session: AdminSession = JSON.parse(payloadJson);

    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to read current admin session from request cookies
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Create audit log entry in database using service role client
 */
export async function logAdminAction(
  supabase: any,
  adminUsername: string,
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'archive' | 'report_resolve' | 'login',
  targetType: string,
  targetId?: string | number,
  details?: Record<string, any>,
) {
  try {
    await supabase.from('admin_audit_logs').insert([{
      admin_username: adminUsername,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      details,
    }]);
  } catch {
    // Non-blocking log insertion failure
  }
}
