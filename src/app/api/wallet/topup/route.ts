import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

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

    if (isNaN(amount) || amount < 1000) {
      return NextResponse.json(
        { success: false, error: "Minimal summa: 1 000 so'm" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: requestRecord, error: insertError } = await supabase
      .from('topup_requests')
      .insert({
        reader_id: profile.id,
        amount: Math.floor(amount),
        status: 'pending',
      })
      .select('id, amount')
      .single();

    if (insertError || !requestRecord) {
      return NextResponse.json(
        { success: false, error: insertError?.message || 'So‘rov yaratishda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      requestId: requestRecord.id,
      amount: requestRecord.amount,
      publicId: profile.public_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
