import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { generateIdempotencyKey } from '@/lib/utils/currency';

export async function POST(request: Request) {
  try {
    const admin = await getCurrentProfile(request.headers.get('Authorization'));

    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar ushbu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const action = String(body.action || '').trim().toLowerCase();
    const amount = Number(body.amount);
    const reason = String(body.reason || '').trim();
    const note = body.note ? String(body.note).trim() : null;
    const idempotencyKey = body.idempotencyKey
      ? String(body.idempotencyKey).trim()
      : generateIdempotencyKey(`adj_${userId.slice(0, 8)}_${Date.now()}`);

    // Validation
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Foydalanuvchi identifikatori ko‘rsatilmadi' },
        { status: 400 },
      );
    }

    if (action !== 'credit' && action !== 'debit') {
      return NextResponse.json(
        { success: false, error: 'Amal turi faqat "credit" (pul qo‘shish) yoki "debit" (pul ayrish) bo‘lishi shart' },
        { status: 400 },
      );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Summa musbat butun son bo‘lishi lozim (tiyin/kasr sonlarsiz)' },
        { status: 400 },
      );
    }

    if (amount < 1000) {
      return NextResponse.json(
        { success: false, error: 'Minimal o‘zgartirish summasi: 1 000 so‘m' },
        { status: 400 },
      );
    }

    if (amount > 100000000) {
      return NextResponse.json(
        { success: false, error: 'Maksimal bir martalik o‘zgartirish summasi 100 000 000 so‘m' },
        { status: 400 },
      );
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Balansni o‘zgartirish sababi majburiy ko‘rsatilishi shart' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Call atomic PostgreSQL RPC
    const { data, error } = await supabase.rpc('admin_adjust_wallet_balance', {
      p_target_user_id: userId,
      p_action: action,
      p_amount: amount,
      p_reason: reason,
      p_note: note,
      p_idempotency_key: idempotencyKey,
      p_admin_id: admin.id,
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message || 'Balansni o‘zgartirishda xatolik yuz berdi' },
        { status: 400 },
      );
    }

    // Notify user of balance adjustment
    try {
      const { createInSiteNotification } = await import('@/lib/notifications/inSite');
      const { formatUZS } = await import('@/lib/utils/currency');
      await createInSiteNotification({
        userId,
        type: 'wallet_adjustment',
        title: action === 'credit' ? 'Balansingiz to‘ldirildi' : 'Balansdan mablag‘ yechildi',
        body: `Hisobingiz ${formatUZS(amount)} ga ${action === 'credit' ? 'to‘ldirildi' : 'kamaytirildi'}. Sabab: ${reason}`,
        linkUrl: '/kabinet',
        data: { amount, action, reason },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      receipt: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
