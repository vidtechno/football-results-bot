import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: 'Noto‘g‘ri ID' }, { status: 400 });
  const db = createAdminClient();
  const [{ count: views }, { count: readers }, { count: bookmarks }, { count: completed }, { count: followers }] = await Promise.all([
    db.from('analytics_events').select('id', { count: 'exact', head: true }).eq('work_id', params.id).eq('event_type', 'work_view'),
    db.from('reading_progress').select('id', { count: 'exact', head: true }).eq('work_id', params.id),
    db.from('reading_bookmarks').select('id', { count: 'exact', head: true }).eq('work_id', params.id),
    db.from('reading_progress').select('id', { count: 'exact', head: true }).eq('work_id', params.id).gte('progress_percentage', 100),
    db.from('work_follows').select('id', { count: 'exact', head: true }).eq('work_id', params.id),
  ]);
  return NextResponse.json({ views: views || 0, readers: readers || 0, bookmarks: bookmarks || 0, completed: completed || 0, followers: followers || 0 }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
