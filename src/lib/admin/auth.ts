import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types/platform';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Server-only Admin authorization & recognition module for Manbora.
 * Uses Supabase authentication as the primary and single identity system.
 * Evaluates verified email against the server-only ADMIN_EMAILS allowlist.
 */

/**
 * Parses and returns the list of normalized allowlisted admin emails from ADMIN_EMAILS.
 * Server-only; never exposed to browser client.
 */
export function getAllowlistedAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks whether an email address is in the server-only allowlist.
 * Case-insensitive and trimmed.
 */
export function isAllowlistedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const allowlist = getAllowlistedAdminEmails();
  return allowlist.includes(normalized);
}

/**
 * Verifies whether the authenticated user's email has been confirmed.
 * Prevents unverified or spoofed email addresses from receiving admin privileges.
 */
export function isUserEmailVerified(user: {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}): boolean {
  return Boolean(user.email_confirmed_at || user.confirmed_at);
}

/**
 * Evaluates an authenticated user and synchronizes `public.profiles.is_admin = true`
 * if and only if their verified email is in the ADMIN_EMAILS allowlist.
 * Uses the protected server-side service-role client.
 */
export async function syncUserAdminStatus(user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}): Promise<boolean> {
  if (!isAllowlistedAdminEmail(user.email) || !isUserEmailVerified(user)) {
    return false;
  }

  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profiles')
      .update({ is_admin: true, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      // If table doesn't exist yet, warn gracefully
      console.warn('public.profiles admin yangilashda xatolik (migratsiya qo‘llanganini tekshiring):', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('syncUserAdminStatus kutilmagan xatolik:', err);
    return false;
  }
}

/**
 * Verifies that the request comes from an authenticated administrator.
 * Automatically synchronizes allowlisted verified admins.
 */
export async function verifyAdminProfile(authHeader?: string | null): Promise<Profile | null> {
  const profile = await getCurrentProfile(authHeader);
  if (!profile || !profile.is_admin) {
    return null;
  }
  return profile;
}

/**
 * Strictly requires an authenticated administrator or throws an error.
 */
export async function requireAdmin(authHeader?: string | null): Promise<Profile> {
  const profile = await verifyAdminProfile(authHeader);
  if (!profile) {
    throw new Error('Faqat administratorlar bu amalni bajarishi mumkin');
  }
  return profile;
}

/**
 * Logs privileged admin actions into the immutable database audit log.
 */
export async function logAdminAction(
  supabase: SupabaseClient,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (err) {
    console.error('Audit log yozishda xatolik:', err);
  }
}
