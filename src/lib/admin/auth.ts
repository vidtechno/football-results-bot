import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types/platform';

export const ADMIN_COOKIE_NAME = 'manbora_admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 64;

export interface AdminSession {
  username: string;
  role: 'owner' | 'editor' | 'reviewer';
  expiresAt: number;
  userId?: string;
}

const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remainingMs?: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= 5) {
    return { allowed: false, remainingMs: windowMs - (now - record.firstAttempt) };
  }

  record.count += 1;
  return { allowed: true };
}

export function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    'sha512',
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = Number.parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];

  if (
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !/^[a-f0-9]{128}$/i.test(originalHash)
  ) {
    return false;
  }

  try {
    const computedHash = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      PBKDF2_KEY_LENGTH,
      'sha512',
    );
    const expectedHash = Buffer.from(originalHash, 'hex');

    return (
      computedHash.length === expectedHash.length &&
      crypto.timingSafeEqual(computedHash, expectedHash)
    );
  } catch {
    return false;
  }
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || 'default_fallback_session_secret_for_manbora_rebuild_min_32_chars';
  return secret;
}

export function createSessionToken(
  username: string,
  role: 'owner' | 'editor' | 'reviewer' = 'owner',
  userId?: string,
): string {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload: AdminSession = { username, role, expiresAt, userId };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token?: string | null): AdminSession | null {
  if (!token) return null;

  try {
    const [payloadBase64, signature, extra] = token.split('.');
    if (!payloadBase64 || !signature || extra) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadBase64)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    ) as AdminSession;

    return Date.now() > session.expiresAt ? null : session;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Verifies whether the actor has admin permissions, checking either
 * the secure admin session cookie OR the database profiles.is_admin flag.
 */
export async function verifyIsAdmin(actorIdOrUsername?: string): Promise<boolean> {
  const session = await getAdminSession();
  if (session) return true;

  if (!actorIdOrUsername) return false;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .or(`id.eq.${actorIdOrUsername},username.eq.${actorIdOrUsername}`)
    .single();

  return Boolean(data?.is_admin);
}

export async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert([
      {
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata: metadata || {},
      },
    ]);
  } catch {
    // Audit logging must not block primary operations
  }
}
