import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const admin = createAdminClient();

    const [notificationsRes, unreadRes] = await Promise.all([
      admin
        .from('in_site_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30),
      admin
        .from('in_site_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false),
    ]);

    const notifications = notificationsRes.data || [];
    const unread_count = unreadRes.count || 0;

    return NextResponse.json({ notifications, unread_count });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Iltimos, avval tizimga kiring' }, { status: 401 });
    }

    const body = await req.json();
    const { action, id } = body;

    const admin = createAdminClient();

    if (action === 'mark_all_read') {
      await admin
        .from('in_site_notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      return NextResponse.json({ success: true });
    } else if (action === 'mark_read' && id) {
      await admin
        .from('in_site_notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('id', id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Noto‘g‘ri action' }, { status: 400 });
  } catch (err: any) {
    console.error('Notifications POST error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
