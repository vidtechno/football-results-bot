import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();
  const code = String(body.code || '').trim().toUpperCase();
  const workId = String(body.workId || '');
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !workId) {
    return NextResponse.json({ valid: false, error: 'Promo-kod yoki asar noto‘g‘ri' }, { status: 400 });
  }

  const admin = createAdminClient();
  const [{ data: work }, { data: promo }] = await Promise.all([
    admin.from('works').select('id,author_id,full_work_price,status,access_type').eq('id', workId).maybeSingle(),
    admin.from('promo_codes').select('id,code,author_id,work_id,discount_type,discount_value,max_uses,used_count,starts_at,expires_at,is_active').eq('code', code).maybeSingle(),
  ]);
  if (!work || work.status !== 'published' || !['paid_full_work', 'paid_book'].includes(work.access_type)) {
    return NextResponse.json({ valid: false, error: 'Pullik asar topilmadi' }, { status: 404 });
  }

  const now = Date.now();
  const invalid = !promo || !promo.is_active || promo.author_id !== work.author_id ||
    (promo.work_id !== null && promo.work_id !== workId) ||
    new Date(promo.starts_at).getTime() > now ||
    (promo.expires_at !== null && new Date(promo.expires_at).getTime() <= now) ||
    (promo.max_uses !== null && promo.used_count >= promo.max_uses);
  if (invalid) {
    return NextResponse.json({ valid: false, error: 'Promo-kod amal qilmaydi' }, { status: 400 });
  }

  const originalPrice = Number(work.full_work_price);
  const discount = promo.discount_type === 'percent'
    ? Math.floor(originalPrice * Math.min(Number(promo.discount_value), 90) / 100)
    : Math.min(originalPrice, Number(promo.discount_value));
  return NextResponse.json({ valid: true, promoId: promo.id, originalPrice, discount, finalPrice: Math.max(0, originalPrice - discount) });
}
