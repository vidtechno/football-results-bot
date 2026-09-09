import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('atomic promo purchases', () => {
  const migration = read('supabase/migrations/036_atomic_promo_purchases_remove_subscriptions.sql');

  it('locks the promo and all wallet rows inside one database function', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.purchase_content_with_promo');
    expect(migration).toContain('FROM public.promo_codes');
    expect(migration.match(/FOR UPDATE/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('charges the discounted price and splits that exact amount', () => {
    expect(migration).toContain('v_price := GREATEST(0, v_original_price - v_discount)');
    expect(migration).toContain('v_author_net := v_price - v_commission');
    expect(migration).toContain('gross_amount, commission_amount, author_net_amount');
  });

  it('atomically records redemption, increments usage, and grants access', () => {
    expect(migration).toContain('SET used_count = used_count + 1');
    expect(migration).toContain('INSERT INTO public.promo_redemptions');
    expect(migration).toContain('INSERT INTO public.entitlements');
  });

  it('server purchase route passes promo code to the financial engine', () => {
    const route = read('src/app/api/purchases/unlock/route.ts');
    const engine = read('src/lib/financial/engine.ts');
    expect(route).toContain('promoCode');
    expect(engine).toContain("rpc('purchase_content_with_promo'");
    expect(engine).toContain('p_promo_code:');
  });
});

describe('author subscriptions removed', () => {
  it('disables plans and removes the purchase RPC without deleting history', () => {
    const migration = read('supabase/migrations/036_atomic_promo_purchases_remove_subscriptions.sql');
    expect(migration).toContain('SET is_active = FALSE');
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.purchase_author_subscription');
    expect(migration).not.toContain('DROP TABLE');
  });

  it('no longer grants paid-content access from subscriptions', () => {
    expect(read('src/lib/security/access.ts')).not.toContain("from('author_subscriptions')");
  });
});
