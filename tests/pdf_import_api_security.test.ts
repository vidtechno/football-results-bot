import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/admin/auth', () => ({ requireAdmin: mocks.requireAdmin, logAdminAction: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/pdf-import/ai', () => ({ reviewLowConfidenceChapters: vi.fn() }));
import { GET, PATCH, POST } from '@/app/api/admin/pdf-import/route';

describe('PDF importer API authorization', () => {
  beforeEach(() => mocks.requireAdmin.mockResolvedValue(null));

  it.each([
    ['GET', () => GET(new NextRequest('http://localhost/api/admin/pdf-import'))],
    [
      'POST',
      () => POST(new NextRequest('http://localhost/api/admin/pdf-import', { method: 'POST' })),
    ],
    [
      'PATCH',
      () => PATCH(new NextRequest('http://localhost/api/admin/pdf-import', { method: 'PATCH' })),
    ],
  ])('returns 403 before touching payload for non-admin %s requests', async (_method, invoke) => {
    const response = await invoke();
    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('administrator');
  });
});
