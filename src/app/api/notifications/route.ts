import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const admin = createAdminClient();

    // Query genuine in-site notifications for this user
    const [notificationsRes, unreadRes] = await Promise.all([
      admin
        .from('in_site_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(40),
      admin
        .from('in_site_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .is('read_at', null),
    ]);

    const rawList = notificationsRes.data || [];
    const notifications = rawList.map((n: any) => ({
      ...n,
      is_read: Boolean(n.is_read || (n.read_at && n.read_at !== null)),
    }));

    const unread_count = unreadRes.count ?? notifications.filter((n: any) => !n.is_read).length;

    return NextResponse.json({
      notifications,
      unread_count,
    });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Server xatosi', notifications: [], unread_count: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ error: 'Iltimos, avval tizimga kiring' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, id, mark_all_read } = body;

    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    if (action === 'mark_all_read' || mark_all_read === true) {
      const { error } = await admin
        .from('in_site_notifications')
        .update({ is_read: true, read_at: nowIso })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) {
        // In case read_at column hasn't been migrated yet, fallback to updating is_read only
        await admin
          .from('in_site_notifications')
          .update({ is_read: true })
          .eq('user_id', profile.id)
          .eq('is_read', false);
      }

      return NextResponse.json({ success: true });
    } else if ((action === 'mark_read' || !action) && id) {
      const { error } = await admin
        .from('in_site_notifications')
        .update({ is_read: true, read_at: nowIso })
        .eq('user_id', profile.id)
        .eq('id', id);

      if (error) {
        await admin
          .from('in_site_notifications')
          .update({ is_read: true })
          .eq('user_id', profile.id)
          .eq('id', id);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Noto‘g‘ri action' }, { status: 400 });
  } catch (err: any) {
    console.error('Notifications POST error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
