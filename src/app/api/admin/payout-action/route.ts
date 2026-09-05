import { NextResponse } from 'next/server';
import { verifyAdminProfile } from '@/lib/admin/auth';
import { executeAdminApprovePayout, executeAdminRejectPayout } from '@/lib/financial/engine';
import { createAdminClient } from '@/lib/supabase/server';

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

      const result = await executeAdminApprovePayout(admin.id, requestId, proofUrl, adminNote);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      // Notify author of payout approval
      try {
        const supabase = createAdminClient();
        const { data: payout } = await supabase
          .from('payout_requests')
          .select('author_id, requested_amount')
          .eq('id', requestId)
          .maybeSingle();

        if (payout?.author_id) {
          const { createInSiteNotification } = await import('@/lib/notifications/inSite');
          await createInSiteNotification({
            userId: payout.author_id,
            type: 'payout_approved',
            title: 'Pul yechish so‘rovi tasdiqlandi',
            body: `Siz so‘ragan ${Number(payout.requested_amount).toLocaleString()} so‘m mablag‘ kartangizga o‘tkazildi.`,
            linkUrl: '/muallif',
            data: { requestId, proofUrl },
          });
        }
      } catch {
        // Never allow notification failure to block response
      }

      return NextResponse.json(result);
    } else if (action === 'reject') {
      const result = await executeAdminRejectPayout(admin.id, requestId, adminNote, false);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      // Notify author of payout rejection
      try {
        const supabase = createAdminClient();
        const { data: payout } = await supabase
          .from('payout_requests')
          .select('author_id, requested_amount')
          .eq('id', requestId)
          .maybeSingle();

        if (payout?.author_id) {
          const { createInSiteNotification } = await import('@/lib/notifications/inSite');
          await createInSiteNotification({
            userId: payout.author_id,
            type: 'payout_rejected',
            title: 'Pul yechish so‘rovi rad etildi',
            body: `Pul yechish so‘rovingiz rad etildi.${adminNote ? ` Sabab: ${adminNote}` : ''}`,
            linkUrl: '/muallif',
            data: { requestId, adminNote },
          });
        }
      } catch {
        // Never allow notification failure to block response
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
