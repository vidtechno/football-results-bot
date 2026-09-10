import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiya talab etiladi' },
        { status: 401 },
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      try {
        const text = await request.text();
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const workId = String(body.workId || '').trim();
    const chapterId = String(body.chapterId || '').trim();
    const pageIndex = Math.max(1, Math.floor(Number(body.pageIndex || body.page || 1)));
    const totalPages = Math.max(1, Math.floor(Number(body.totalPages || 1)));
    const paragraphOffset = Math.max(0, Math.floor(Number(body.paragraphOffset || 0)));
    const percentage = Math.max(
      0,
      Math.min(100, Math.round(Number(body.percentage || body.progress || 0))),
    );
    const chapterPercentage = Math.max(
      0,
      Math.min(100, Math.round(Number(body.chapterPercentage ?? percentage))),
    );
    const isCompleted = Boolean(body.isCompleted || percentage >= 98);
    const activeSeconds = Math.max(0, Math.min(90, Math.floor(Number(body.activeSeconds || 0))));
    const pageAdvanced = Boolean(body.pageAdvanced);
    const bookCompleted = Boolean(body.bookCompleted);

    if (!workId || !chapterId) {
      return NextResponse.json(
        { success: false, error: 'Asar va bob talab qilinadi' },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    const serverNow = Date.now();
    const nowIso = new Date(serverNow).toISOString();

    // Validate and normalize incoming timestamp
    let incomingTime = body.timestamp ? Number(body.timestamp) : serverNow;
    if (isNaN(incomingTime) || incomingTime < 1577836800000) {
      // Absurd or missing timestamp (< 2020-01-01) -> default to server time
      incomingTime = serverNow;
    } else if (incomingTime > serverNow + 60000) {
      // Future timestamp beyond 1 min clock skew -> clamp to server time
      incomingTime = serverNow;
    }

    // Prevent stale progress from overwriting newer progress (e.g. from an older inactive tab on same or different chapter)
    const { data: existingProgress } = await adminClient
      .from('reading_progress')
      .select('last_read_at, chapter_id, percentage')
      .eq('user_id', profile.id)
      .eq('work_id', workId)
      .maybeSingle();

    if (existingProgress && existingProgress.last_read_at) {
      const existingTime = new Date(existingProgress.last_read_at).getTime();
      // If incoming timestamp is demonstrably older than existing server progress, reject it
      if (!isNaN(existingTime) && incomingTime < existingTime - 1000) {
        return NextResponse.json({
          success: true,
          ignored: true,
          reason: 'Eski progress e’tiborsiz qoldirildi (newer server progress exists)',
        });
      }
    }

    const lastReadAtIso = new Date(incomingTime).toISOString();

    // 1. Authoritative Reading Progress update (user_id + work_id unique constraint)
    const { error: progressError } = await adminClient.from('reading_progress').upsert(
      {
        user_id: profile.id,
        work_id: workId,
        chapter_id: chapterId,
        page_index: pageIndex,
        total_pages: totalPages,
        paragraph_offset: paragraphOffset,
        percentage,
        is_completed: isCompleted,
        last_read_at: lastReadAtIso,
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
    await adminClient.from('library_items').upsert(
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

    // A single bounded database call keeps completion milestones in sync.
    // Migration 041 removes the former streak/XP writes from this function.
    const { error: activityError } = await adminClient.rpc('record_reading_activity', {
      p_user_id: profile.id,
      p_work_id: workId,
      p_chapter_id: chapterId,
      p_percentage: chapterPercentage,
      p_active_seconds: activeSeconds,
      p_page_advanced: pageAdvanced,
      p_book_completed: bookCompleted,
    });
    if (activityError && !activityError.message.includes('record_reading_activity')) {
      console.warn('reading activity warning:', activityError.message);
    }

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
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
