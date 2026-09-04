import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { getAdminSession, verifyIsAdmin } from '@/lib/admin/auth';
import { executeAdminApproveTopup } from '@/lib/financial/engine';

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSession();
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    const isAdmin = Boolean(adminSession || (profile && profile.is_admin));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const adminId = profile?.id || adminSession?.userId || '00000000-0000-0000-0000-000000000000';
    const body = await request.json();
    const requestId = String(body.requestId || '');
    const action = String(body.action || ''); // 'approve' | 'reject'
    const proofUrl = body.proofUrl ? String(body.proofUrl).trim() : '';
    const adminNote = body.adminNote ? String(body.adminNote).trim() : '';

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'So‘rov identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      const result = await executeAdminApproveTopup(adminId, requestId, proofUrl, adminNote);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    } else if (action === 'reject') {
      const supabase = createAdminClient();
      const { error: updateError } = await supabase
        .from('topup_requests')
        .update({
          status: 'rejected',
          admin_note: adminNote,
          reviewed_by: adminId !== '00000000-0000-0000-0000-000000000000' ? adminId : null,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'So‘rov rad etildi' });
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
