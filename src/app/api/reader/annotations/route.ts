import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';
import { canReadChapter } from '@/lib/security/access';

export const dynamic = 'force-dynamic';
const COLORS = new Set(['yellow', 'green', 'blue', 'pink']);

export async function GET(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
  const url = new URL(request.url);
  const chapterId = url.searchParams.get('chapterId');
  const admin = createAdminClient();
  let query = admin.from('reading_annotations').select(`
    id, work_id, chapter_id, page_number, quote, note, color, start_offset, end_offset, created_at, updated_at,
    work:works(title, slug), chapter:chapters(title, slug, chapter_number)
  `).eq('user_id', profile.id).order('updated_at', { ascending: false }).limit(200);
  if (chapterId) query = query.eq('chapter_id', chapterId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotations: data || [] });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
  const body = await request.json();
  const workId = String(body.workId || '');
  const chapterId = String(body.chapterId || '');
  const quote = String(body.quote || '').trim().slice(0, 2000);
  const note = String(body.note || '').trim().slice(0, 4000) || null;
  const color = COLORS.has(body.color) ? body.color : 'yellow';
  if (!workId || !chapterId || !quote) return NextResponse.json({ error: 'Iqtibos, asar va bob talab qilinadi' }, { status: 400 });
  const access = await canReadChapter(profile.id, chapterId, { isAdminRoute: profile.is_admin });
  if (!access.canRead) return NextResponse.json({ error: 'Bu bob uchun ruxsat yo‘q' }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('reading_annotations').insert({
    user_id: profile.id, work_id: workId, chapter_id: chapterId,
    page_number: Math.max(1, Math.floor(Number(body.pageNumber) || 1)), quote, note, color,
    start_offset: Math.max(0, Math.floor(Number(body.startOffset) || 0)),
    end_offset: Math.max(0, Math.floor(Number(body.endOffset) || quote.length)),
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ annotation: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
  const body = await request.json();
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ('note' in body) changes.note = String(body.note || '').trim().slice(0, 4000) || null;
  if (COLORS.has(body.color)) changes.color = body.color;
  const { data, error } = await createAdminClient().from('reading_annotations').update(changes)
    .eq('id', String(body.id || '')).eq('user_id', profile.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Qayd topilmadi' }, { status: 404 });
  return NextResponse.json({ annotation: data });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID talab qilinadi' }, { status: 400 });
  const { error } = await createAdminClient().from('reading_annotations').delete().eq('id', id).eq('user_id', profile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
