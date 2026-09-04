import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { getAdminSession, logAdminAction } from '@/lib/admin/auth';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: settings, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const map: Record<string, any> = {};
    (settings || []).forEach((s) => {
      map[s.key] = s.value;
    });

    return NextResponse.json({ success: true, settings: map });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminSession = await getAdminSession();
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    const isAdmin = Boolean(adminSession || (profile && profile.is_admin));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar sozlamalarni o‘zgartirishi mumkin' },
        { status: 403 },
      );
    }

    const adminId = profile?.id || adminSession?.userId || '00000000-0000-0000-0000-000000000000';
    const body = await request.json();
    const { commissionPercentage, minimumPayout, telegramUsername } = body;

    const supabase = createAdminClient();

    if (commissionPercentage !== undefined) {
      await supabase.from('platform_settings').upsert({
        key: 'commission_percentage',
        value: Number(commissionPercentage),
        updated_at: new Date().toISOString(),
      });
    }

    if (minimumPayout !== undefined) {
      await supabase.from('platform_settings').upsert({
        key: 'minimum_payout',
        value: Number(minimumPayout),
        updated_at: new Date().toISOString(),
      });
    }

    if (telegramUsername !== undefined) {
      await supabase.from('platform_settings').upsert({
        key: 'telegram_support_username',
        value: String(telegramUsername).replace('@', '').trim(),
        updated_at: new Date().toISOString(),
      });
    }

    await logAdminAction(supabase, adminId, 'update_platform_settings', 'platform_settings', 'global', {
      commissionPercentage,
      minimumPayout,
      telegramUsername,
    });

    return NextResponse.json({ success: true, message: 'Sozlamalar muvaffaqiyatli saqlandi' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
