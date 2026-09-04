import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const body = await request.json();
    const workId = String(body.workId || '').trim();
    const chapterId = String(body.chapterId || '').trim();
    const pageIndex = Math.max(1, Math.floor(Number(body.pageIndex || body.page || 1)));
    const totalPages = Math.max(1, Math.floor(Number(body.totalPages || 1)));
    const paragraphOffset = Math.max(0, Math.floor(Number(body.paragraphOffset || 0)));
    const percentage = Math.max(0, Math.min(100, Math.round(Number(body.percentage || body.progress || 0))));
    const isCompleted = Boolean(body.isCompleted || percentage >= 98);

    if (!workId || !chapterId) {
      return NextResponse.json({ success: false, error: 'Asar va bob talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Authoritative Reading Progress update (user_id + work_id unique constraint)
    const { error: progressError } = await adminClient
      .from('reading_progress')
      .upsert(
        {
          user_id: profile.id,
          work_id: workId,
          chapter_id: chapterId,
          page_index: pageIndex,
          total_pages: totalPages,
          paragraph_offset: paragraphOffset,
          percentage,
          is_completed: isCompleted,
          last_read_at: nowIso,
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id,work_id',
        },
      );

    if (progressError) {
      console.warn('reading_progress upsert warning:', progressError.message);
    }

    // 2. Keep library_items aggregate view synced
    await adminClient
      .from('library_items')
      .upsert(
        {
          user_id: profile.id,
          work_id: workId,
          last_read_chapter_id: chapterId,
          reading_progress: percentage,
          saved_state: isCompleted ? 'completed' : 'reading',
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id,work_id',
        },
      );

    return NextResponse.json({
      success: true,
      data: {
        workId,
        chapterId,
        pageIndex,
        totalPages,
        percentage,
        isCompleted,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
