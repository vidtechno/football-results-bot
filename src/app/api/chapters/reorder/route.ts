import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const items = body.items as Array<{ id: string; chapterNumber: number }>;

    if (!workId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Asar va boblar ro‘yxati talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: work } = await adminClient
      .from('works')
      .select('id, author_id')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Faqat o‘zingizning asaringizdagi boblarni tartiblashingiz mumkin' },
        { status: 403 },
      );
    }

    // Step 1: Temporarily shift chapter_number to offset to avoid unique constraint collisions
    for (const item of items) {
      await adminClient
        .from('chapters')
        .update({ chapter_number: item.chapterNumber + 10000 })
        .eq('id', item.id)
        .eq('work_id', workId);
    }

    // Step 2: Set final chapter numbers
    for (const item of items) {
      await adminClient
        .from('chapters')
        .update({
          chapter_number: item.chapterNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('work_id', workId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reorder error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
