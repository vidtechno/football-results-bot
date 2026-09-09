import { afterEach, expect, it, vi } from 'vitest';
import { createCatalogueClient } from '../src/lib/supabase/catalogue';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('shares only anonymous catalogue GETs and keeps writes uncached', async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
  const fetchMock = vi.fn().mockImplementation(async () => new Response('[]', {
    status: 200, headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  const client = createCatalogueClient();
  await client.from('genres').select('id');
  const read = fetchMock.mock.calls[0][1];
  expect(read.cache).toBeUndefined();
  expect(read.next.revalidate).toBe(30);
  expect(new Headers(read.headers).get('Authorization')).toBe('Bearer public-test-key');
  expect(new Headers(read.headers).has('Cookie')).toBe(false);
  await client.from('genres').insert({ name: 'test' });
  expect(fetchMock.mock.calls[1][1].cache).toBe('no-store');
});
