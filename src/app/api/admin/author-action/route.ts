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
    const userId = String(body.userId || '');
    const action = String(body.action || ''); // 'approve' | 'reject'
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason).trim() : null;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Foydalanuvchi identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('author_profiles')
        .update({
          status: 'approved',
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'approve_author', 'author_profiles', userId, {});

      return NextResponse.json({ success: true, message: 'Mualliflik arizasi tasdiqlandi' });
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('author_profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason || 'Ariza talablarga mos kelmadi',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'reject_author', 'author_profiles', userId, {
        reason: rejectionReason,
      });

      return NextResponse.json({ success: true, message: 'Mualliflik arizasi rad etildi' });
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
