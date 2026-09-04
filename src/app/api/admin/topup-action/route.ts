import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile } from '@/lib/admin/auth';
import { executeAdminApproveTopup } from '@/lib/financial/engine';

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
      const result = await executeAdminApproveTopup(admin.id, requestId, proofUrl, adminNote);
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
          reviewed_by: admin.id,
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
