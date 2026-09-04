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
    const archive = body.archive !== false; // default true

    if (!workId) {
      return NextResponse.json({ success: false, error: 'Asar IDsi talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: work } = await adminClient
      .from('works')
      .select('id, author_id, title')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Faqat o‘zingizning asaringizni arxivlashingiz mumkin' },
        { status: 403 },
      );
    }

    const { error: updateError } = await adminClient
      .from('works')
      .update({
        is_archived: archive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workId);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: archive ? 'Asar muvaffaqiyatli arxivlandi' : 'Asar arxivdan chiqarildi',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
