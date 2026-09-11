import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  getCurrentProfile: mocks.getCurrentProfile,
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: mocks.update,
    }),
  }),
}));

import { DELETE } from '@/app/api/works/delete/route';

const request = () =>
  new Request('http://localhost/api/works/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workId: 'work-1' }),
  });

describe('work deletion API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateEq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.updateEq });
  });

  it('rejects unauthenticated deletion', async () => {
    mocks.getCurrentProfile.mockResolvedValue(null);
    expect((await DELETE(request())).status).toBe(401);
  });

  it('rejects deletion of another author work', async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: 'author-b', is_admin: false, role: 'user' });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: 'work-1', author_id: 'author-a', title: 'Asar', slug: 'asar' },
    });
    expect((await DELETE(request())).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('lets an owner soft-delete a published or paid work without deleting accounting data', async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: 'author-a', is_admin: false, role: 'user' });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'work-1',
        author_id: 'author-a',
        title: 'Asar',
        slug: 'asar',
        status: 'published',
      },
    });
    const response = await DELETE(request());
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'archived', is_archived: true }),
    );
  });

  it('preserves administrator access', async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: 'admin', is_admin: true, role: 'admin' });
    mocks.maybeSingle.mockResolvedValue({
      data: { id: 'work-1', author_id: 'author-a', title: 'Asar', slug: 'asar', status: 'draft' },
    });
    expect((await DELETE(request())).status).toBe(200);
  });
});
