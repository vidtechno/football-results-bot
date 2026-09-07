import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminProfile } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const profile = await verifyAdminProfile(req.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  const db = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * 86400000).toISOString();
  const since7 = new Date(now - 7 * 86400000).toISOString();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [{ data: events }, { count: online }, { count: newToday }, { count: new7 }, { count: new30 }, { data: works }] = await Promise.all([
    db.from('analytics_events').select('session_id,event_type,work_id,device_type,referrer_host,created_at').gte('created_at', since30).limit(10000),
    db.from('analytics_presence').select('session_id', { count: 'exact', head: true }).gte('last_seen_at', new Date(now - 180000).toISOString()),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since7),
    db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', since30),
    db.from('works').select('id,title'),
  ]);
  const rows = events || [];
  const unique = (items: typeof rows) => new Set(items.map(x => x.session_id)).size;
  const countBy = (key: 'device_type' | 'referrer_host') => Object.entries(rows.reduce<Record<string, number>>((a, x) => { const k = x[key] || (key === 'referrer_host' ? 'To‘g‘ridan-to‘g‘ri' : 'Noma’lum'); a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const workNames = new Map((works || []).map(w => [w.id, w.title]));
  const workCounts = rows.filter(x => x.work_id && x.event_type === 'work_view').reduce<Record<string, number>>((a,x) => { a[x.work_id!] = (a[x.work_id!] || 0) + 1; return a; }, {});
  return NextResponse.json({ online: online || 0, visitorsToday: unique(rows.filter(x => x.created_at >= today.toISOString())), visitors7: unique(rows.filter(x => x.created_at >= since7)), visitors30: unique(rows), pageViewsToday: rows.filter(x => x.event_type === 'page_view' && x.created_at >= today.toISOString()).length, registrations: { today: newToday || 0, seven: new7 || 0, thirty: new30 || 0 }, devices: countBy('device_type'), sources: countBy('referrer_host'), topWorks: Object.entries(workCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,count]) => ({ id, title: workNames.get(id) || 'Noma’lum asar', count })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
