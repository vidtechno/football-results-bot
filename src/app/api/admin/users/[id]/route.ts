import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await getCurrentProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar ruxsat etilgan' },
        { status: 403 },
      );
    }

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Foydalanuvchi ID talab etiladi' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch Profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ success: false, error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    // 2. Fetch Wallet & Transactions
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('id, balance')
      .eq('user_id', userId)
      .eq('account_type', 'reader_credit')
      .maybeSingle();

    let transactions: any[] = [];
    if (wallet?.id) {
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('account_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(20);
      transactions = txData || [];
    }

    // 3. Fetch Purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select(`
        id,
        purchase_type,
        gross_amount,
        created_at,
        work:works (id, title, slug),
        chapter:chapters (id, chapter_number, title)
      `)
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Fetch Library Items
    const { data: library } = await supabase
      .from('library_items')
      .select(`
        id,
        saved_state,
        created_at,
        work:works (id, title, slug, cover_url)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // 5. Fetch Author details (if any)
    const { data: author } = await supabase
      .from('author_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    let authorWorks: any[] = [];
    let authorPayouts: any[] = [];
    let authorBalances = { available: 0, reserved: 0 };

    if (author) {
      const [worksRes, payoutsRes, avWalletRes, resWalletRes] = await Promise.all([
        supabase.from('works').select('id, title, slug, status, type, access_type, created_at').eq('author_id', userId).order('created_at', { ascending: false }),
        supabase.from('payout_requests').select('id, requested_amount, status, created_at').eq('author_id', userId).order('created_at', { ascending: false }).limit(10),
        supabase.from('wallet_accounts').select('balance').eq('user_id', userId).eq('account_type', 'author_earnings_available').maybeSingle(),
        supabase.from('wallet_accounts').select('balance').eq('user_id', userId).eq('account_type', 'author_earnings_reserved').maybeSingle(),
      ]);

      authorWorks = worksRes.data || [];
      authorPayouts = payoutsRes.data || [];
      authorBalances = {
        available: Number(avWalletRes.data?.balance || 0),
        reserved: Number(resWalletRes.data?.balance || 0),
      };
    }

    // 6. Fetch Recent Admin Audit Logs related to this user
    const { data: auditLogs } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .or(`entity_id.eq.${userId},metadata->>target_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(15);

    return NextResponse.json({
      success: true,
      user: {
        ...profile,
        balance: Number(wallet?.balance || 0),
        wallet_id: wallet?.id || null,
        transactions,
        purchases: purchases || [],
        library: library || [],
        author: author
          ? {
              ...author,
              works: authorWorks,
              payouts: authorPayouts,
              balances: authorBalances,
            }
          : null,
        audit_logs: auditLogs || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
