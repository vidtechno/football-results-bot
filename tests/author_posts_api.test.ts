import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  from: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  getCurrentProfile: mocks.profile,
  createAdminClient: () => ({ from: mocks.from }),
}));
vi.mock('next/cache', () => ({ revalidateTag: mocks.invalidate }));
import { POST } from '@/app/api/author/posts/route';

describe('author announcement publishing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.mockResolvedValue({ id: 'author-user-id', is_admin: false });
  });

  function setup(approved: boolean, error: object | null = null) {
    const lookup = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue({ data: approved ? [{ user_id: 'author-user-id' }] : [], error }),
    };
    const insert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({
          data: { id: 'post-id', content: 'Salom', pinned: true },
          error: null,
        }),
    };
    mocks.from.mockImplementation((table) => (table === 'author_profiles' ? lookup : insert));
    return { lookup, insert };
  }

  const request = () =>
    new NextRequest('http://localhost/api/author/posts', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: ' Salom ', pinned: true, author_id: 'forged-id' }),
    });

  it('publishes for an approved author using session identity and invalidates the feed', async () => {
    const { lookup, insert } = setup(true);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(lookup.select).toHaveBeenCalledWith('user_id');
    expect(lookup.eq).toHaveBeenCalledWith('user_id', 'author-user-id');
    expect(lookup.eq).toHaveBeenCalledWith('status', 'approved');
    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        author_id: 'author-user-id',
        content: 'Salom',
        pinned: true,
        is_published: true,
      }),
    );
    expect(mocks.invalidate).toHaveBeenCalledWith('public-author-posts');
  });

  it('rejects an unapproved author without inserting a post', async () => {
    const { insert } = setup(false);
    expect((await POST(request())).status).toBe(403);
    expect(insert.insert).not.toHaveBeenCalled();
  });

  it('reports a database failure as a server error, not unapproved author status', async () => {
    const { insert } = setup(false, { code: '42703' });
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect((await response.json()).error).not.toContain('Faqat tasdiqlangan');
    expect(insert.insert).not.toHaveBeenCalled();
  });
});
