import { NextResponse } from 'next/server';
import { verifyAdminProfile } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu ma’lumotlarni ko‘ra oladi' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    const supabase = createAdminClient();

    // 1. Build filtered query for payouts
    let query = supabase
      .from('payout_requests')
      .select(`
        id,
        author_id,
        requested_amount,
        full_legal_name,
        masked_card,
        status,
        payment_proof_url,
        author_note,
        admin_note,
        reviewed_by,
        reviewed_at,
        paid_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (status === 'pending') {
      query = query.in('status', ['pending', 'under_review']);
    } else if (status === 'paid') {
      query = query.eq('status', 'paid');
    } else if (status === 'rejected') {
      query = query.in('status', ['rejected', 'cancelled']);
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    // 2. Fetch payouts and tab count metrics concurrently
    const [
      { data: rawPayouts, error: payoutsError },
      { count: pendingCount },
      { count: paidCount },
      { count: rejectedCount },
      { count: allCount },
    ] = await Promise.all([
      query,
      supabase.from('payout_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
      supabase.from('payout_requests').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase.from('payout_requests').select('id', { count: 'exact', head: true }).in('status', ['rejected', 'cancelled']),
      supabase.from('payout_requests').select('id', { count: 'exact', head: true }),
    ]);

    if (payoutsError) {
      console.error('Error fetching payout_requests:', payoutsError);
      return NextResponse.json(
        { success: false, error: 'Pul yechish so‘rovlarini yuklab bo‘lmadi: ' + payoutsError.message },
        { status: 500 },
      );
    }

    const rows = rawPayouts || [];

    // 3. Batch-fetch author details without fragile foreign key assumptions
    const authorIds = Array.from(new Set(rows.map((r: any) => r.author_id).filter(Boolean)));

    let authorProfiles: any[] = [];
    let profiles: any[] = [];

    if (authorIds.length > 0) {
      const [authorRes, profRes] = await Promise.all([
        supabase
          .from('author_profiles')
          .select('user_id, pen_name')
          .in('user_id', authorIds),
        supabase
          .from('profiles')
          .select('id, public_id, display_name, email')
          .in('id', authorIds),
      ]);

      authorProfiles = authorRes.data || [];
      profiles = profRes.data || [];
    }

    const authorMap = new Map<string, any>();
    authorProfiles.forEach((a) => authorMap.set(a.user_id, a));

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => profileMap.set(p.id, p));

    // 4. Transform into unified response format
    const payouts = rows.map((p: any) => {
      const authorProf = authorMap.get(p.author_id);
      const userProf = profileMap.get(p.author_id);
      const penName = authorProf?.pen_name || userProf?.display_name || p.full_legal_name || 'Muallif';

      return {
        ...p,
        legal_name: p.full_legal_name,
        author: {
          user_id: p.author_id,
          pen_name: penName,
          profile: userProf || null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      payouts,
      counts: {
        all: allCount || 0,
        pending: pendingCount || 0,
        paid: paidCount || 0,
        rejected: rejectedCount || 0,
      },
    });
  } catch (err: any) {
    console.error('Server exception in /api/admin/payouts:', err);
    return NextResponse.json(
      { success: false, error: 'Serverda kutilmagan xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
