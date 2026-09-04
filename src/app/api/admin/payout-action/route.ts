import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/admin/auth';
import { executeAdminApprovePayout, executeAdminRejectPayout } from '@/lib/financial/engine';

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
    const action = String(body.action || ''); // 'mark_paid' | 'reject'
    const proofUrl = body.proofUrl ? String(body.proofUrl).trim() : '';
    const adminNote = body.adminNote ? String(body.adminNote).trim() : '';

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'So‘rov identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    if (action === 'mark_paid') {
      if (!proofUrl) {
        return NextResponse.json(
          { success: false, error: 'To‘lov cheki/skrinshoti havolasi kiritilishi shart' },
          { status: 400 },
        );
      }

      const result = await executeAdminApprovePayout(adminId, requestId, proofUrl, adminNote);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
    } else if (action === 'reject') {
      const result = await executeAdminRejectPayout(adminId, requestId, adminNote, false);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json(result);
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
