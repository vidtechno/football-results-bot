import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/admin/auth';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ notifications: [], unread_count: 0 });
    }

    const supabase = createAdminClient();

    const [
      { data: topups },
      { data: payouts },
      { data: works },
      { data: authors },
    ] = await Promise.all([
      supabase.from('topup_requests').select('id, amount, created_at').eq('status', 'pending').limit(5),
      supabase.from('payout_requests').select('id, requested_amount, created_at').eq('status', 'pending').limit(5),
      supabase.from('works').select('id, title, created_at').eq('status', 'pending_review').limit(5),
      supabase.from('author_profiles').select('user_id, pen_name, created_at').eq('status', 'pending').limit(5),
    ]);

    const notifications: any[] = [];

    (topups || []).forEach((t) => {
      notifications.push({
        id: `topup_${t.id}`,
        title: 'Yangi hisob to‘ldirish',
        summary: `Mablag‘: ${t.amount} so‘m tasdiqlash kutilmoqda`,
        link_url: '/diyoration/dashboard?tab=topups',
        created_at: t.created_at,
        is_read: false,
        type: 'topup',
      });
    });

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
        link_url: '/diyoration/dashboard?tab=authors',
        created_at: a.created_at,
        is_read: false,
        type: 'author',
      });
    });

    return NextResponse.json({
      notifications,
      unread_count: notifications.length,
    });
  } catch (err: any) {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }
}
