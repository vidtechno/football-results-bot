import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) {
      return NextResponse.json({ notifications: [], unread_count: 0 }, { status: 403 });
    }

    const supabase = createAdminClient();

    const [
      { data: payouts },
      { data: works },
      { data: authors },
      { data: workRevisions },
    ] = await Promise.all([
      supabase.from('payout_requests').select('id, requested_amount, created_at').eq('status', 'pending').limit(5),
      supabase.from('works').select('id, title, created_at').eq('status', 'pending_review').limit(5),
      supabase.from('author_profiles').select('user_id, pen_name, created_at').eq('status', 'pending').limit(5),
      supabase.from('work_revisions').select('id, title, created_at').eq('status', 'pending_review').limit(5),
    ]);

    const notifications: any[] = [];

    (payouts || []).forEach((p) => {
      notifications.push({
        id: `payout_${p.id}`,
        title: 'Pul yechish so‘rovi',
        summary: `Summa: ${p.requested_amount} so‘m to‘lanishi kerak`,
        link_url: '/diyoration/dashboard?tab=payouts',
        created_at: p.created_at,
        is_read: false,
        type: 'payout',
      });
    });

    (works || []).forEach((w) => {
      notifications.push({
        id: `work_${w.id}`,
        title: 'Asar moderatsiyasi',
        summary: `"${w.title}" asari tekshiruv kutilmoqda`,
        link_url: '/diyoration/dashboard?tab=works',
        created_at: w.created_at,
        is_read: false,
        type: 'work',
      });
    });

    (authors || []).forEach((a) => {
      notifications.push({
        id: `author_${a.user_id}`,
        title: 'Mualliflik arizasi',
        summary: `"${a.pen_name}" mualliflik arizasi berdi`,
        link_url: '/diyoration/mualliflar',
        created_at: a.created_at,
        is_read: false,
        type: 'author',
      });
    });

    (workRevisions || []).forEach((r) => {
      notifications.push({
        id: `revision_${r.id}`,
        title: 'Yangi tahrir moderatsiyasi',
        summary: `"${r.title}" asariga yangi tahrir yuborildi`,
        link_url: '/diyoration/tahrirlar',
        created_at: r.created_at,
        is_read: false,
        type: 'revision',
      });
    });

    return NextResponse.json({
      notifications,
      unread_count: notifications.length,
    });
  } catch {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
}
