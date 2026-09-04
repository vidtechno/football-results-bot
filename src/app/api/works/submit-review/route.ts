import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const workId = String(body.workId || '');

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Asar identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify ownership and check that work has at least 1 chapter
    const { data: work } = await supabase
      .from('works')
      .select('id, author_id, status')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Asar topilmadi yoki sizga tegishli emas' },
        { status: 403 },
      );
    }

    const { count } = await supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('work_id', workId);

    if (!count || count === 0) {
      return NextResponse.json(
        { success: false, error: 'Asarni ko‘rib chiqishga yuborishdan avval kamida 1 ta bob qo‘shishingiz lozim' },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from('works')
      .update({
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', workId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message || 'Statusni yangilashda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Asar muvaffaqiyatli moderatsiyaga yuborildi',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
