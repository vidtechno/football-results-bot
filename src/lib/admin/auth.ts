import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types/platform';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin authorization module for Manbora.
 * Uses Supabase authentication as the primary and single identity system.
 * Verifies that the authenticated user profile has `is_admin = true`.
 */

export async function verifyAdminProfile(authHeader?: string | null): Promise<Profile | null> {
  const profile = await getCurrentProfile(authHeader);
  if (!profile || !profile.is_admin) {
    return null;
  }
  return profile;
}

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
