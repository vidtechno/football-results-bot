import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
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

    let notifications = notificationsRes.data || [];
    let unread_count = unreadRes.count || 0;

    // If profile is admin, include pending moderation queue alerts
    if (profile.is_admin) {
      try {
        const [
          { count: pendingPayouts },
          { count: pendingWorks },
          { count: pendingAuthors },
          { count: pendingRevisions },
        ] = await Promise.all([
          admin.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          admin.from('works').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
          admin.from('author_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
          admin.from('chapter_revisions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        ]);

        const totalPending = (pendingPayouts || 0) + (pendingWorks || 0) + (pendingAuthors || 0) + (pendingRevisions || 0);
        if (totalPending > 0) {
          notifications = [
            {
              id: 'admin_moderation_queue_item',
              user_id: profile.id,
              type: 'admin_queue',
              title: 'Moderatsiya navbati',
              body: `${totalPending} ta yangi arizalar va moderatsiya so‘rovlari kutilmoqda.`,
              link_url: '/diyoration/dashboard',
              is_read: false,
              created_at: new Date().toISOString(),
            },
            ...notifications,
          ];
          unread_count += 1;
        }
      } catch {
        // Moderation queue fetch fallback
      }
    }

    return NextResponse.json({ notifications, unread_count });
  } catch (err: any) {
    console.error('Notifications GET error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
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
