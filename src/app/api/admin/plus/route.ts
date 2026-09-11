import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

async function adminFor(request: Request) {
  try { return await requireAdmin(request.headers.get('Authorization')); } catch { return null; }
}
export async function GET(request: Request) {
  const admin = await adminFor(request);
  if (!admin) return NextResponse.json({ error: 'Faqat administratorlar uchun' }, { status: 403 });
  const db = createAdminClient();
  await db.rpc('expire_manbora_plus');
  const [{ data: stats, error: statsError }, { data: setting }, { data: works }] = await Promise.all([
    db.rpc('get_admin_plus_stats', { p_admin_id: admin.id }),
    db.from('platform_settings').select('value').eq('key', 'plus_monthly_price').maybeSingle(),
    db.from('works').select('id,title,status,is_plus,author:author_profiles(profile:profiles(is_admin))').order('updated_at', { ascending: false }).limit(500),
  ]);
  if (statsError) return NextResponse.json({ error: 'Plus statistikasini olib bo‘lmadi' }, { status: 500 });
  return NextResponse.json({
    price: Number(setting?.value || 30000),
    totalRevenue: Number(stats?.totalRevenue || 0),
    activeCount: Number(stats?.activeCount || 0),
    monthly: Array.isArray(stats?.monthly) ? stats.monthly : [],
    works: (works || []).filter((work: any) => {
      const author = Array.isArray(work.author) ? work.author[0] : work.author;
      const profile = Array.isArray(author?.profile) ? author.profile[0] : author?.profile;
      return profile?.is_admin;
    }),
  });
}
export async function PATCH(request: Request) {
  const admin = await adminFor(request);
  if (!admin) return NextResponse.json({ error: 'Faqat administratorlar uchun' }, { status: 403 });
  const body = await request.json();
  const { error } = await createAdminClient().rpc('set_work_plus', {
    p_work_id: String(body.workId || ''), p_admin_id: admin.id, p_is_plus: Boolean(body.isPlus),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
