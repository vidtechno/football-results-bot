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

      // Notify user
      const { createInSiteNotification } = await import('@/lib/notifications/inSite');
      await createInSiteNotification({
        userId,
        type: 'author_approved',
        title: 'Mualliflik arizangiz tasdiqlandi!',
        body: 'Tabriklaymiz! Siz endi Manborada o‘z asarlaringizni erkin nashr qilishingiz mumkin.',
        linkUrl: '/muallif',
      });

      return NextResponse.json({ success: true, message: 'Mualliflik arizasi tasdiqlandi' });
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Arizani rad etish sababi majburiy ko‘rsatilishi shart' },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from('author_profiles')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'reject_author', 'author_profiles', userId, {
        reason: rejectionReason,
      });

      // Notify user
      const { createInSiteNotification } = await import('@/lib/notifications/inSite');
      await createInSiteNotification({
        userId,
        type: 'author_rejected',
        title: 'Mualliflik arizangiz rad etildi',
        body: `Mualliflik arizangiz rad etildi. Sabab: ${rejectionReason}`,
        linkUrl: '/kabinet',
      });

      return NextResponse.json({ success: true, message: 'Mualliflik arizasi rad etildi' });
    } else if (action === 'suspend' || action === 'restrict') {
      const reason = rejectionReason || 'Administrator tomonidan nashr qilish to‘xtatildi';
      const { error: updateError } = await supabase
        .from('author_profiles')
        .update({
          status: 'suspended',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'suspend_author', 'author_profiles', userId, {
        reason,
      });

      return NextResponse.json({ success: true, message: 'Mualliflik huquqi vaqtincha cheklandi' });
    } else if (action === 'restore') {
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

      await logAdminAction(supabase, admin.id, 'restore_author', 'author_profiles', userId, {});

      return NextResponse.json({ success: true, message: 'Mualliflik maqomi qayta tiklandi' });
    } else if (action === 'note') {
      const note = String(body.note || '').trim();
      if (!note) {
        return NextResponse.json({ success: false, error: 'Izoh matni bo‘sh bo‘lishi mumkin emas' }, { status: 400 });
      }

      await logAdminAction(supabase, admin.id, 'author_admin_note', 'author_profiles', userId, {
        note,
      });

      return NextResponse.json({ success: true, message: 'Administrator izohi qayd etildi' });
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
