import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const [{ data: notifications }, { count }] = await Promise.all([
      supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('admin_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false),
    ]);

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unread_count: count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi' }, { status: 401 });
  }

  try {
    const { id, mark_all_read } = await req.json();
    const supabase = createAdminClient();

    if (mark_all_read) {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);
    } else if (id) {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
