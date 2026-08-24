import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi. Qaytadan kiring.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { id, status, internal_notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Hisobot ID va statusi kiritilishi shart' }, { status: 400 });
    }

    const { error } = await supabase
      .from('organization_reports')
      .update({
        status,
        internal_notes: internal_notes ? internal_notes.trim() : null,
        reviewed_by: session.username,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(supabase, session.username, 'report_resolve', 'organization_report', id, { status, internal_notes });

    return NextResponse.json({ success: true, message: 'Hisobot holati yangilandi' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
