import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentProfile: vi.fn(),
  rpc: vi.fn(),
  updateUserById: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
  profileLookup: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getCurrentProfile: mocks.getCurrentProfile,
  createAdminClient: () => ({
    rpc: mocks.rpc,
    auth: { admin: { updateUserById: mocks.updateUserById } },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: mocks.profileLookup }) }) };
      }
      if (table === 'user_admin_state') return { upsert: mocks.upsert };
      if (table === 'admin_audit_logs') return { insert: mocks.insert };
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import { GET } from '@/app/api/admin/users/route';
import { PATCH } from '@/app/api/admin/users/[id]/route';

const listRequest = (query = '') => new Request(`http://localhost/api/admin/users${query}`);
const patchRequest = (body: unknown) =>
  new Request('http://localhost/api/admin/users/u1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const ctx = { params: Promise.resolve({ id: 'u1' }) };

describe('admin users list API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue({ id: 'admin-1', is_admin: true });
    mocks.rpc.mockResolvedValue({ data: { total: 31, rows: [] }, error: null });
  });

  it('rejects non-admins', async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: 'u', is_admin: false });
    expect((await GET(listRequest())).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('paginates on the server and reports total pages', async () => {
    const response = await GET(listRequest('?page=3&limit=15&filter=plus&sort=seen_desc&q=ali'));
    const body = await response.json();
    expect(mocks.rpc).toHaveBeenCalledWith('admin_list_users', {
      p_q: 'ali',
      p_filter: 'plus',
      p_sort: 'seen_desc',
      p_limit: 15,
      p_offset: 30,
    });
    expect(body.total).toBe(31);
    expect(body.totalPages).toBe(3);
  });

  it('falls back to safe defaults for unknown filter and sort values', async () => {
    await GET(listRequest('?filter=1;drop&sort=hack&limit=9999'));
    expect(mocks.rpc).toHaveBeenCalledWith(
      'admin_list_users',
      expect.objectContaining({ p_filter: 'all', p_sort: 'created_desc', p_limit: 50 }),
    );
  });
});

describe('admin user actions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentProfile.mockResolvedValue({ id: 'admin-1', is_admin: true });
    mocks.profileLookup.mockResolvedValue({ data: { id: 'u1', is_admin: false, display_name: 'Ali' } });
    mocks.updateUserById.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('rejects non-admins', async () => {
    mocks.getCurrentProfile.mockResolvedValue({ id: 'u', is_admin: false });
    expect((await PATCH(patchRequest({ action: 'block', reason: 'spam' }), ctx)).status).toBe(403);
  });

  it('requires a reason to block', async () => {
    const response = await PATCH(patchRequest({ action: 'block', reason: ' ' }), ctx);
    expect(response.status).toBe(400);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it('bans the auth user and records the reason when blocking', async () => {
    const response = await PATCH(patchRequest({ action: 'block', reason: 'Spam yuborgan' }), ctx);
    expect(response.status).toBe(200);
    expect(mocks.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: '876000h' });
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', is_blocked: true, blocked_reason: 'Spam yuborgan' }),
      { onConflict: 'user_id' },
    );
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'user_blocked' }));
  });

  it('never blocks administrators', async () => {
    mocks.profileLookup.mockResolvedValue({ data: { id: 'u1', is_admin: true } });
    const response = await PATCH(patchRequest({ action: 'block', reason: 'test sababi' }), ctx);
    expect(response.status).toBe(400);
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it('rejects unknown actions and invalid Plus durations', async () => {
    expect((await PATCH(patchRequest({ action: 'delete_everything' }), ctx)).status).toBe(400);
    expect((await PATCH(patchRequest({ action: 'grant_plus', days: 9999 }), ctx)).status).toBe(400);
  });
});
