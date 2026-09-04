import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const admin = await getCurrentProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu ma’lumotlarni ko‘ra oladi' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const filter = searchParams.get('filter') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    let query = supabase
      .from('profiles')
      .select(`
        id,
        public_id,
        display_name,
        username,
        avatar_url,
        email,
        is_admin,
        created_at,
        updated_at,
        author:author_profiles (user_id, pen_name, status),
        wallet:wallet_accounts (id, account_type, balance)
      `, { count: 'exact' });

    // Safely parameterized search
    if (q) {
      // Check if query is a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      if (isUuid) {
        query = query.eq('id', q);
      } else {
        const sanitized = q.replace(/[%_,]/g, ' ');
        query = query.or(
          `display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,public_id.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
        );
      }
    }

    // Filters
    if (filter === 'admins') {
      query = query.eq('is_admin', true);
    }

    // Execute query with pagination and ordering
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: rawUsers, count, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Normalize and format user list
    let users = (rawUsers || []).map((u: any) => {
      const readerWallet = Array.isArray(u.wallet)
        ? u.wallet.find((w: any) => w.account_type === 'reader_credit')
        : u.wallet?.account_type === 'reader_credit'
        ? u.wallet
        : null;

      const authorInfo = Array.isArray(u.author) ? u.author[0] : u.author;

      return {
        id: u.id,
        public_id: u.public_id,
        display_name: u.display_name,
        username: u.username,
        avatar_url: u.avatar_url,
        email: u.email || '—',
        is_admin: u.is_admin,
        role: u.is_admin ? 'Administrator' : authorInfo ? 'Muallif' : 'Kitobxon',
        balance: readerWallet ? Number(readerWallet.balance) : 0,
        author_status: authorInfo ? authorInfo.status : null,
        created_at: u.created_at,
      };
    });

    // Post-filter for wallet balance or author status if needed
    if (filter === 'positive_balance') {
      users = users.filter((u) => u.balance > 0);
    } else if (filter === 'authors') {
      users = users.filter((u) => Boolean(u.author_status));
    } else if (filter === 'readers') {
      users = users.filter((u) => !u.is_admin && !u.author_status);
    } else if (filter === 'restricted') {
      users = users.filter((u) => u.author_status === 'suspended' || u.author_status === 'rejected');
    }

    return NextResponse.json({
      success: true,
      users,
      total: count || users.length,
      page,
      totalPages: Math.ceil((count || users.length) / limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
