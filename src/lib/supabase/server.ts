import * as React from 'react';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile } from '@/lib/types/platform';

// React.cache is available in React Server Components; provide passthrough fallback for test/node runners
const requestCache = typeof (React as any).cache === 'function'
  ? (React as any).cache
  : (<T extends (...args: any[]) => any>(fn: T): T => fn);

if (typeof window !== 'undefined') {
  throw new Error('Ushbu modul faqat server tomonida ishlatilishi shart (server-only)!');
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY muhit o‘zgaruvchisi o‘rnatilmagan!');
  }

  return createClient(
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
 * Creates a server-side client with anon key for public data.
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Resolves current user and their profile on server side.
 * Memoized per request using React.cache() to prevent duplicate round-trips.
 * Checks Bearer Authorization header or cookie session.
 */
export const getCurrentProfile = requestCache(async function getCurrentProfile(authHeader?: string | null): Promise<Profile | null> {
  const adminClient = createAdminClient();

  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    try {
      const cookieStore = cookies();
      const possibleCookieNames = [
        'sb-access-token',
        'supabase-auth-token',
        'sb-auth-token',
      ];
      for (const name of possibleCookieNames) {
        const val = cookieStore.get(name)?.value;
        if (val) {
          token = val;
          break;
        }
      }
    } catch {
      // In contexts where cookies() is not available
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) return null;

    let { data: profile, error: profError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profError) {
      console.warn('public.profiles jadvalini o‘qishda xatolik (migratsiya holatini tekshiring):', profError.message);
    }

    // Secure email allowlist and verification check
    const email = user.email ? user.email.trim().toLowerCase() : '';
    const isVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
    const allowlistedEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isAllowlistedAdmin = Boolean(email && allowlistedEmails.includes(email) && isVerified);

    if (isAllowlistedAdmin && profile && !profile.is_admin) {
      try {
        await adminClient
          .from('profiles')
          .update({ is_admin: true, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        profile.is_admin = true;
      } catch (err) {
        console.error('Admin huquqlarini sinxronizatsiyalashda xatolik:', err);
      }
    }

    return (profile as Profile) || null;
  } catch {
    return null;
  }
});
