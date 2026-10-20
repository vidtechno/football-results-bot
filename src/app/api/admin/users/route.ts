import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

const FILTERS = new Set([
  'all', 'admins', 'authors', 'pending_authors', 'readers', 'plus', 'blocked',
  'positive_balance', 'restricted', 'online', 'inactive_30d',
]);
const SORTS = new Set(['created_desc', 'seen_desc', 'balance_desc', 'name_asc']);

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
    const q = (searchParams.get('q') || '').trim().slice(0, 100);
    const rawFilter = searchParams.get('filter') || 'all';
    const rawSort = searchParams.get('sort') || 'created_desc';
    const filter = FILTERS.has(rawFilter) ? rawFilter : 'all';
    const sort = SORTS.has(rawSort) ? rawSort : 'created_desc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10) || 15));

    const { data, error } = await createAdminClient().rpc('admin_list_users', {
      p_q: q || null,
      p_filter: filter,
      p_sort: sort,
      p_limit: limit,
      p_offset: (page - 1) * limit,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const total = Number(data?.total || 0);
    const users = (data?.rows || []).map((u: any) => ({
      id: u.id,
      public_id: u.public_id,
      display_name: u.display_name,
      username: u.username,
      avatar_url: u.avatar_url,
      email: u.email || '—',
      is_admin: u.is_admin,
      role: u.is_admin ? 'Administrator' : u.author_status ? 'Muallif' : 'Kitobxon',
      balance: Number(u.balance || 0),
      author_status: u.author_status || null,
      has_plus: Boolean(u.has_plus),
      is_blocked: Boolean(u.is_blocked),
      last_seen_at: u.last_seen_at || null,
      created_at: u.created_at,
    }));

    return NextResponse.json({
      success: true,
      users,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
