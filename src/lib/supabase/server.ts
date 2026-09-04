import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Profile } from '@/lib/types/platform';

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
 * Checks Bearer Authorization header or cookie session.
 */
export async function getCurrentProfile(authHeader?: string | null): Promise<Profile | null> {
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
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return (profile as Profile) || null;
  } catch {
    return null;
  }
}
