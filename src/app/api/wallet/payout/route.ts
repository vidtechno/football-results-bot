import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { executeAuthorPayoutRequest } from '@/lib/financial/engine';
import { isValidCardNumber } from '@/lib/utils/currency';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const legalName = String(body.legalName || '').trim();
    const cardNumber = String(body.cardNumber || '').replace(/\s+/g, '');
    const authorNote = String(body.authorNote || '').trim();

    if (isNaN(amount) || amount < 100000) {
      return NextResponse.json(
        { success: false, error: "Minimal yechib olish miqdori: 100 000 so'm" },
        { status: 400 },
      );
    }

    if (!legalName) {
      return NextResponse.json(
        { success: false, error: 'Karta egasining ismi talab qilinadi' },
        { status: 400 },
      );
    }

    if (!isValidCardNumber(cardNumber)) {
      return NextResponse.json(
        { success: false, error: 'Karta raqami 16 ta raqamdan iborat bo‘lishi lozim' },
        { status: 400 },
      );
    }

    const result = await executeAuthorPayoutRequest(
      profile.id,
      amount,
      legalName,
      cardNumber,
      authorNote,
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
