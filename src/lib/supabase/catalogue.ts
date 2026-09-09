import { createClient } from '@supabase/supabase-js';

/** Anonymous, read-only public catalogue. Never use for balances or reader content. */
export function createCatalogueClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key',
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => fetch(input, {
          ...init,
          ...(init?.method === undefined || init.method === 'GET'
            ? { cache: undefined, next: { revalidate: 30, tags: ['public-catalogue'] } }
            : { cache: 'no-store' }),
        }),
      },
    },
  );
}
