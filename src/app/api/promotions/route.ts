import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const workId = searchParams.get('workId');
    const amount = Number(searchParams.get('amount') || 0);

    if (!code) {
      return NextResponse.json({ error: 'Promokod kiritilishi shart' }, { status: 400 });
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data: promo, error } = await admin
      .from('promotions')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !promo) {
      return NextResponse.json({
        valid: false,
        error: 'Promokod mavjud emas yoki muddati tugagan',
      });
    }

    // Check dates
    if (promo.starts_at && promo.starts_at > now) {
      return NextResponse.json({
        valid: false,
        error: 'Ushbu promokodning amal qilish muddati hali boshlanmagan',
      });
    }

    if (promo.expires_at && promo.expires_at < now) {
      return NextResponse.json({
        valid: false,
        error: 'Ushbu promokodning amal qilish muddati tugagan',
      });
    }

    // Check usage count
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json({
        valid: false,
        error: 'Ushbu promokoddan foydalanish limiti tugagan',
      });
    }

    // Check applicable work
    if (promo.applicable_work_id && workId && promo.applicable_work_id !== workId) {
      return NextResponse.json({
        valid: false,
        error: 'Ushbu promokod faqat ma’lum bir asar uchun amal qiladi',
      });
    }

    // Check minimum order amount
    if (promo.min_order_amount && amount < promo.min_order_amount) {
      return NextResponse.json({
        valid: false,
        error: `Ushbu promokod uchun minimal buyurtma summasi ${promo.min_order_amount} so‘m`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = Math.round((amount * Number(promo.discount_value)) / 100);
    } else {
      discountAmount = Math.min(amount, Number(promo.discount_value));
    }

    discountAmount = Math.max(0, Math.min(amount, discountAmount));
    const netAmount = Math.max(0, amount - discountAmount);

    return NextResponse.json({
      valid: true,
      promoId: promo.id,
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount,
      netAmount,
      fundedBy: promo.funded_by,
      message: `${discountAmount} so‘m chegirma muvaffaqiyatli qo‘llanildi!`,
    });
  } catch (err: any) {
    console.error('Promotion validate error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
