import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const admin = await getCurrentProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar ruxsat etilgan' },
        { status: 403 },
      );
    }

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

    const [stateRes, plusRes] = await Promise.all([
      supabase
        .from('user_admin_state')
        .select('last_seen_at, is_blocked, blocked_at, blocked_reason')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('plus_subscriptions')
        .select('id, starts_at, expires_at, price_paid')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      success: true,
      user: {
        ...profile,
        last_seen_at: stateRes.data?.last_seen_at || null,
        is_blocked: Boolean(stateRes.data?.is_blocked),
        blocked_at: stateRes.data?.blocked_at || null,
        blocked_reason: stateRes.data?.blocked_reason || null,
        plus: plusRes.data || null,
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

const PLUS_GRANT_DAYS = new Set([7, 30, 90, 365]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const admin = await getCurrentProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar ruxsat etilgan' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');
    const supabase = createAdminClient();

    const { data: target } = await supabase
      .from('profiles')
      .select('id, is_admin, display_name')
      .eq('id', userId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ success: false, error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    if (action === 'block' || action === 'unblock') {
      if (userId === admin.id || target.is_admin) {
        return NextResponse.json(
          { success: false, error: 'Administratorni yoki o‘zingizni bloklab bo‘lmaydi' },
          { status: 400 },
        );
      }
      const blocking = action === 'block';
      const reason = String(body?.reason || '').trim().slice(0, 300);
      if (blocking && reason.length < 3) {
        return NextResponse.json({ success: false, error: 'Bloklash sababini yozing' }, { status: 400 });
      }

      const { error: banError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: blocking ? '876000h' : 'none',
      });
      if (banError) {
        return NextResponse.json({ success: false, error: banError.message }, { status: 500 });
      }

      await supabase.from('user_admin_state').upsert({
        user_id: userId,
        is_blocked: blocking,
        blocked_at: blocking ? new Date().toISOString() : null,
        blocked_reason: blocking ? reason : null,
        blocked_by: blocking ? admin.id : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      await logAdminAction(supabase, admin.id, blocking ? 'user_blocked' : 'user_unblocked', 'user', userId, {
        target_user_id: userId,
        reason: blocking ? reason : undefined,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'grant_plus') {
      const days = Number(body?.days);
      if (!PLUS_GRANT_DAYS.has(days)) {
        return NextResponse.json({ success: false, error: 'Noto‘g‘ri muddat' }, { status: 400 });
      }
      const now = new Date();
      const { data: current } = await supabase
        .from('plus_subscriptions')
        .select('expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('expires_at', now.toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const startsAt = current ? new Date(current.expires_at) : now;
      const expiresAt = new Date(startsAt.getTime() + days * 86_400_000);

      const { error } = await supabase.from('plus_subscriptions').insert({
        user_id: userId,
        status: 'active',
        starts_at: current ? now.toISOString() : startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        price_paid: 0,
        idempotency_key: `admin-grant:${userId}:${crypto.randomUUID()}`,
      });
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      await logAdminAction(supabase, admin.id, 'plus_granted', 'user', userId, {
        target_user_id: userId,
        days,
        expires_at: expiresAt.toISOString(),
      });
      return NextResponse.json({ success: true, expires_at: expiresAt.toISOString() });
    }

    if (action === 'revoke_plus') {
      const { error } = await supabase
        .from('plus_subscriptions')
        .update({ status: 'expired', expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'active');
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      await logAdminAction(supabase, admin.id, 'plus_revoked', 'user', userId, { target_user_id: userId });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Noma’lum amal' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
