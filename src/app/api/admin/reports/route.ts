import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Ruxsat berilmagan' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15));

    const admin = createAdminClient();

    let query = admin
      .from('user_reports')
      .select(`
        id, target_type, target_id, reason, details, status, admin_notes, created_at, resolved_at,
        reporter:profiles!reporter_id (id, display_name, username, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    if (['pending', 'resolved', 'dismissed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: reports, error, count } = await query.range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching admin reports:', error);
      return NextResponse.json({ reports: [], total: 0, page, totalPages: 1 });
    }

    const total = count || 0;
    return NextResponse.json({
      reports: reports || [],
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err: any) {
    console.error('Admin reports GET error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile?.is_admin) {
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
