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

    if (!work || (work.author_id !== profile.id && !profile.is_admin)) {
      return NextResponse.json(
        { success: false, error: 'Faqat asar muallifi yoki administrator boblar tartibini o‘zgartirishi mumkin' },
        { status: 403 },
      );
    }

    const chapterIds = items.map((item) => item.id);

    // Call atomic PostgreSQL RPC function
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('reorder_chapters', {
      p_work_id: workId,
      p_chapter_ids: chapterIds,
    });

    if (rpcError) {
      // Fallback for pre-migration 012 environments
      if (rpcError.code === '42883') {
        // Step 1: Temporarily shift chapter_number
        for (const item of items) {
          await adminClient
            .from('chapters')
            .update({ chapter_number: item.chapterNumber + 100000 })
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
      }

      console.error('reorder_chapters RPC xatosi:', rpcError);
      return NextResponse.json({ success: false, error: rpcError.message || 'Boblar tartibini o‘zgartirishda xatolik' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: rpcResult });
  } catch (err: any) {
    console.error('Reorder error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
