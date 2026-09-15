import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  getCurrentProfile: mocks.profile,
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
import { POST } from '@/app/api/plus/subscribe/route';

const request = (body = JSON.stringify({ idempotencyKey: 'plus-purchase-key-123' })) =>
  new Request('http://localhost/api/plus/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

describe('Plus balance-funded purchase API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profile.mockResolvedValue({ id: 'real-user' });
    mocks.rpc.mockResolvedValue({
      data: { success: true, price_paid: 19000, balance_after: 1000 },
      error: null,
    });
  });

  it('requires a real signed-in user', async () => {
    mocks.profile.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects malformed input without invoking financial operations', async () => {
    expect((await POST(request('{broken'))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ idempotencyKey: 'short' })))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('uses session identity and the atomic database purchase function', async () => {
    const response = await POST(
      request(JSON.stringify({ userId: 'forged-user', idempotencyKey: 'plus-purchase-key-123' })),
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('purchase_manbora_plus', {
      p_user_id: 'real-user',
      p_idempotency_key: 'plus-purchase-key-123',
    });
    expect((await response.json()).price_paid).toBe(19000);
  });

  it('returns a failed balance check without reporting activation', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Balansda mablag‘ yetarli emas' },
    });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect((await response.json()).success).toBeUndefined();
  });
});
