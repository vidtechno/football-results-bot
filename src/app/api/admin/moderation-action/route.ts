import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile, logAdminAction } from '@/lib/admin/auth';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const action = String(body.action || ''); // 'approve' | 'reject'
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason).trim() : null;

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Asar identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'publish_work', 'works', workId, {});

      return NextResponse.json({ success: true, message: 'Asar muvaffaqiyatli nashr qilindi' });
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Moderatsiya talablariga mos kelmadi',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'reject_work', 'works', workId, {
        reason: rejectionReason,
      });

      return NextResponse.json({ success: true, message: 'Asar rad etildi' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Noto‘g‘ri harakat' },
        { status: 400 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
