import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { executeAuthorPayoutRequest } from '@/lib/financial/engine';
import { maskCardNumber } from '@/lib/utils/currency';
import { isValidUzbekCardNumber, encryptCardData } from '@/lib/utils/encryption';

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
    const rawCardNumber = String(body.cardNumber || '').replace(/\s+/g, '');
    const authorNote = String(body.authorNote || '').trim();

    if (isNaN(amount) || amount < 100000) {
      return NextResponse.json(
        { success: false, error: "Minimal yechib olish miqdori: 100 000 so'm" },
        { status: 400 },
      );
    }

    if (!legalName) {
      return NextResponse.json(
        { success: false, error: 'Karta egasining to‘liq ismi talab qilinadi' },
        { status: 400 },
      );
    }

    if (!isValidUzbekCardNumber(rawCardNumber)) {
      return NextResponse.json(
        { success: false, error: 'Karta raqami noto‘g‘ri yoki 16 ta raqamdan iborat emas' },
        { status: 400 },
      );
    }

    // Encrypt card using AES-256-GCM secret key and create masked representation
    const maskedCard = maskCardNumber(rawCardNumber);
    const encryptedCard = encryptCardData(rawCardNumber);

    const result = await executeAuthorPayoutRequest(
      profile.id,
      amount,
      legalName,
      encryptedCard,
      maskedCard,
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
