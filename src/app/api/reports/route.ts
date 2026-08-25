import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { ReportSchema } from '@/lib/types/directory';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ReportSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Noto‘g‘ri ma’lumot kiritildi';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { organization_id, report_type, message, target_contact } = parsed.data;
    const supabase = createAdminClient();

    // 1. Fetch organization name for notification summary
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    const orgName = org?.name || `ID #${organization_id}`;

    // 2. Insert report
    const { data: newReport, error } = await supabase
      .from('organization_reports')
      .insert([
        {
          organization_id,
          report_type,
          message: message.trim(),
          target_contact: target_contact || null,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error || !newReport) {
      return NextResponse.json({ error: error?.message || 'Xabar yuborishda xatolik' }, { status: 500 });
    }

    // 3. Create server-side admin notification
    const notificationTitle = report_type === 'contact_issue'
      ? 'Raqam ishlamasligi haqida xabar'
      : 'Yangi Tuzatish Xabari';

    const detailText = target_contact ? `Raqam: ${target_contact} — ${message}` : message;

    await supabase.from('admin_notifications').insert([
      {
        type: 'report',
        title: notificationTitle,
        summary: `“${orgName}” bo‘yicha xabar: ${detailText.slice(0, 75)}...`,
        link_url: '/diyoration/reports',
        target_id: String(newReport.id),
        is_read: false,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Rahmat! Xabaringiz yuborildi va tez orada ko‘rib chiqiladi.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
