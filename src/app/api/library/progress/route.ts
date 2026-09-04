import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const chapterId = String(body.chapterId || '');
    const progress = Math.max(0, Math.min(100, Number(body.progress || 0)));

    if (!workId || !chapterId) {
      return NextResponse.json({ success: false, error: 'Asar va bob talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    await adminClient
      .from('library_items')
      .upsert({
        user_id: profile.id,
        work_id: workId,
        last_read_chapter_id: chapterId,
        reading_progress: progress,
        saved_state: progress >= 95 ? 'completed' : 'reading',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,work_id',
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
