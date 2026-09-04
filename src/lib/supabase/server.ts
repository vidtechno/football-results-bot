import * as React from 'react';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile } from '@/lib/types/platform';

// React.cache is available in React Server Components; provide passthrough fallback for test/node runners
const requestCache = typeof (React as any).cache === 'function'
  ? (React as any).cache
  : (<T extends (...args: any[]) => any>(fn: T): T => fn);

if (typeof window !== 'undefined') {
  throw new Error('Ushbu modul faqat server tomonida ishlatilishi shart (server-only)!');
}

/**
 * Creates a server-side admin client with service_role key.
 * Used strictly for internal operations (bypasses RLS for permission sync and ledger balance updates).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY muhit o‘zgaruvchisi o‘rnatilmagan!');
  }

  return createSupabaseClient(
    supabaseUrl,
    supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/**
 * Creates an official Supabase SSR client reading from Next.js request cookies.
 * Server Components and Server Actions use this client to access the authenticated user's session.
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware refreshes user sessions.
        }
      },
    },
  });
}

export const createServerClient = createServerSupabaseClient;

/**
 * Checks if a given Supabase user object qualifies as an administrator.
 * Requires:
 * 1. Email must exist and match one of the server-only ADMIN_EMAILS entries (normalized).
 * 2. Email must be confirmed/verified (email_confirmed_at or confirmed_at).
 */
export function isUserAllowlistedAdmin(user: any): boolean {
  if (!user || !user.email) return false;

  const email = user.email.trim().toLowerCase();
  const isVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!isVerified) return false;

  const allowlistedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlistedEmails.includes(email);
}

/**
 * Resolves current user and their profile on server side.
 * Memoized per request using React.cache() to prevent duplicate round-trips.
 * Validates session using official @supabase/ssr cookies or Bearer token.
 */
export const getCurrentProfile = requestCache(async function getCurrentProfile(
  authHeader?: string | null
): Promise<Profile | null> {
  const adminClient = createAdminClient();
  let authenticatedUser: any = null;

  // 1. If Bearer token is provided (API route authorization), validate via adminClient
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const { data: { user }, error } = await adminClient.auth.getUser(token);
        if (!error && user) {
          authenticatedUser = user;
        }
      } catch {
        // invalid bearer
      }
    }
  }

  // 2. Validate via official @supabase/ssr cookie client
  if (!authenticatedUser) {
    try {
      const ssrClient = createServerSupabaseClient();
      const { data: { user }, error } = await ssrClient.auth.getUser();
      if (!error && user) {
        authenticatedUser = user;
      }
    } catch {
      // In contexts where cookies() is not available
    }
  }

  // 3. Fallback: check legacy single cookie token if present
  if (!authenticatedUser) {
    try {
      const cookieStore = cookies();
      const legacyToken =
        cookieStore.get('sb-access-token')?.value ||
        cookieStore.get('supabase-auth-token')?.value ||
        cookieStore.get('sb-auth-token')?.value;

      if (legacyToken) {
        const { data: { user }, error } = await adminClient.auth.getUser(legacyToken);
        if (!error && user) {
          authenticatedUser = user;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!authenticatedUser) {
    return null;
  }

  try {
    let { data: profile, error: profError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', authenticatedUser.id)
      .maybeSingle();

    if (profError) {
      console.warn('public.profiles jadvalini o‘qishda xatolik:', profError.message);
    }

    // Check admin eligibility against server-only ADMIN_EMAILS
    const isAdmin = isUserAllowlistedAdmin(authenticatedUser);

    if (isAdmin && profile && !profile.is_admin) {
      try {
        await adminClient
          .from('profiles')
          .update({ is_admin: true, updated_at: new Date().toISOString() })
          .eq('id', authenticatedUser.id);
        profile.is_admin = true;
      } catch (err) {
        console.error('Admin huquqlarini sinxronizatsiyalashda xatolik:', err);
      }
    }

    if (profile) {
      // Server enforces actual verified admin status (never trusts client input or stale flag)
      profile.is_admin = isAdmin && Boolean(profile.is_admin);
    }

    return (profile as Profile) || null;
  } catch {
    return null;
  }
});
