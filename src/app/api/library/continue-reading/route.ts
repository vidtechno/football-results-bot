import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getRecentReadingProgress } from '@/lib/services/progress';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ items: [], primaryItem: null });
    }

    const progressItems = await getRecentReadingProgress(profile.id, 5);

    // Map to backward-compatible format for existing consumers
    const items = progressItems.map((item) => ({
      ...item,
      work_id: item.workId,
      last_chapter: item.chapter,
      chapter: item.chapter,
      page_index: item.pageIndex,
      reading_progress: item.percentage,
      is_completed: item.isCompleted,
      last_read_at: item.lastReadAt,
      relative_time: item.relativeTime,
      read_url: item.resumeUrl,
      resume_url: item.resumeUrl,
    }));

    return NextResponse.json({
      items,
      primaryItem: items[0] || null,
    });
  } catch (err: any) {
    console.error('Error in continue-reading API:', err);
    return NextResponse.json(
      { error: 'Mutolaa ma‘lumotlarini yuklashda xatolik yuz berdi', items: [], primaryItem: null },
      { status: 500 },
    );
  }
}
