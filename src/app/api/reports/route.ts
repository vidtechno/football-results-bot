import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Iltimos, avval tizimga kiring' }, { status: 401 });
    }

    const body = await req.json();
    const { targetType, targetId, reason, details } = body;

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: 'Shikoyat sababi va obyekti ko‘rsatilishi shart' }, { status: 400 });
    }

    if (!['work', 'chapter', 'review', 'author'].includes(targetType)) {
      return NextResponse.json({ error: 'Noto‘g‘ri shikoyat turi' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: report, error } = await admin
      .from('user_reports')
      .insert({
        reporter_id: profile.id,
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
        details: details ? details.trim() : null,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return NextResponse.json({ error: 'Shikoyatni yuborishda xatolik yuz berdi' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Shikoyatingiz qabul qilindi. Moderatsiya jamoasi uni tez orada ko‘rib chiqadi.',
      reportId: report.id,
    });
  } catch (err: any) {
    console.error('Report API error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
