import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { executePurchase } from '@/lib/financial/engine';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Xaridni amalga oshirish uchun tizimga kiring' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const chapterId = body.chapterId ? String(body.chapterId) : null;
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey) : undefined;

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Asar identifikatori ko‘rsatilmagan' },
        { status: 400 },
      );
    }

    const result = await executePurchase(
      profile.id,
      workId,
      chapterId,
      idempotencyKey,
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
