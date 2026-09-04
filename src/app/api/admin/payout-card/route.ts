import { NextResponse } from 'next/server';
import { verifyAdminProfile, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { decryptCardData } from '@/lib/utils/encryption';

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
    const payoutId = String(body.payoutId || '');

    if (!payoutId) {
      return NextResponse.json(
        { success: false, error: 'To‘lov so‘rovi identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: payout, error } = await supabase
      .from('payout_requests')
      .select('id, author_id, protected_card_data, masked_card, requested_amount')
      .eq('id', payoutId)
      .single();

    if (error || !payout) {
      return NextResponse.json(
        { success: false, error: 'To‘lov so‘rovi topilmadi' },
        { status: 404 },
      );
    }

    const decryptedNumber = decryptCardData(payout.protected_card_data);

    // Audit log this sensitive operation
    await logAdminAction(
      supabase,
      admin.id,
      'reveal_payout_card',
      'payout_requests',
      payoutId,
      {
        masked_card: payout.masked_card,
        amount: payout.requested_amount,
        author_id: payout.author_id,
      },
    );

    return NextResponse.json({
      success: true,
      cardNumber: decryptedNumber,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Karta ma‘lumotlarini ochishda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
