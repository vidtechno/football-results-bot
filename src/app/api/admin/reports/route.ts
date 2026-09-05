import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = [
  'anorboyevdiyorbek714@gmail.com',
  'diyorbek@manbora.uz',
  'admin@manbora.uz',
];

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !ADMIN_EMAILS.includes(profile.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: reports, error } = await admin
      .from('user_reports')
      .select(`
        id, target_type, target_id, reason, details, status, admin_notes, created_at, resolved_at,
        reporter:profiles!reporter_id (id, display_name, username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin reports:', error);
      return NextResponse.json({ reports: [] });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err: any) {
    console.error('Admin reports GET error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || !ADMIN_EMAILS.includes(profile.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, action, adminNotes } = body; // action: 'resolved' | 'dismissed'

    if (!reportId || !['resolved', 'dismissed'].includes(action)) {
      return NextResponse.json({ error: 'Noto‘g‘ri parametrlar' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from('user_reports')
      .update({
        status: action,
        admin_notes: adminNotes || null,
        resolved_by: profile.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      return NextResponse.json({ error: 'Statusni yangilab bo‘lmadi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Admin reports POST error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
