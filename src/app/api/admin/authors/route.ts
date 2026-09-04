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
    const status = searchParams.get('status') || 'all';

    const supabase = createAdminClient();

    let query = supabase
      .from('author_profiles')
      .select(`
        user_id,
        pen_name,
        biography,
        status,
        rejection_reason,
        created_at,
        updated_at,
        profile:profiles (
          id,
          public_id,
          display_name,
          username,
          avatar_url,
          email,
          telegram_username
        )
      `)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: rawAuthors, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let authors = (rawAuthors || []).map((a: any) => ({
      user_id: a.user_id,
      pen_name: a.pen_name,
      biography: a.biography,
      status: a.status,
      rejection_reason: a.rejection_reason,
      created_at: a.created_at,
      updated_at: a.updated_at,
      public_id: a.profile?.public_id || '—',
      display_name: a.profile?.display_name || '—',
      username: a.profile?.username || '—',
      email: a.profile?.email || '—',
      avatar_url: a.profile?.avatar_url,
    }));

    if (q) {
      const lower = q.toLowerCase();
      authors = authors.filter(
        (a) =>
          a.pen_name?.toLowerCase().includes(lower) ||
          a.display_name?.toLowerCase().includes(lower) ||
          a.username?.toLowerCase().includes(lower) ||
          a.email?.toLowerCase().includes(lower) ||
          a.public_id?.toLowerCase().includes(lower) ||
          a.user_id?.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({
      success: true,
      authors,
      total: authors.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
