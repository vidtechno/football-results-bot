import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  const db = createAdminClient();
  const [{ data: setting }, { data: subscription }] = await Promise.all([
    db.from('platform_settings').select('value').eq('key', 'plus_monthly_price').maybeSingle(),
    profile
      ? db.from('plus_subscriptions').select('status,expires_at').eq('user_id', profile.id).eq('status', 'active').gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return NextResponse.json({ price: Number(setting?.value || 30000), active: Boolean(subscription), subscription });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Tizimga kirish talab qilinadi' }, { status: 401 });
  const body = await request.json();
  const key = String(body.idempotencyKey || '').trim();
  if (key.length < 12 || key.length > 200) return NextResponse.json({ error: 'Xarid kaliti noto‘g‘ri' }, { status: 400 });
  const { data, error } = await createAdminClient().rpc('purchase_manbora_plus', {
    p_user_id: profile.id,
    p_idempotency_key: key,
  });
  if (error) return NextResponse.json({ error: error.message || 'Plus obunasini faollashtirib bo‘lmadi' }, { status: 400 });
  return NextResponse.json(data);
}
