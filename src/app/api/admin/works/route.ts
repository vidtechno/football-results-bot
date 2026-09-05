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
    const accessType = searchParams.get('access') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const supabase = createAdminClient();

    let query = supabase
      .from('works')
      .select(
        `
        id,
        title,
        slug,
        description,
        cover_url,
        type,
        access_type,
        full_work_price,
        status,
        rejection_reason,
        created_at,
        published_at,
        author:author_profiles (
          user_id,
          pen_name
        ),
        chapters (
          id,
          chapter_number,
          title,
          slug,
          price,
          is_free,
          status
        )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (accessType !== 'all') {
      query = query.eq('access_type', accessType);
    }

    // Push search down to DB
    if (q) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      if (isUuid) {
        query = query.eq('id', q);
      } else {
        const sanitized = q.replace(/[%_,]/g, ' ');
        const { data: matchedAuthors } = await supabase
          .from('author_profiles')
          .select('user_id')
          .ilike('pen_name', `%${sanitized}%`);

        const authorIds = (matchedAuthors || []).map((a) => a.user_id);
        if (authorIds.length > 0) {
          query = query.or(
            `title.ilike.%${sanitized}%,slug.ilike.%${sanitized}%,author_id.in.(${authorIds.join(',')})`
          );
        } else {
          query = query.or(`title.ilike.%${sanitized}%,slug.ilike.%${sanitized}%`);
        }
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: rawWorks, count, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const works = (rawWorks || []).map((w: any) => {
      const authorInfo = Array.isArray(w.author) ? w.author[0] : w.author;
      return {
        id: w.id,
        title: w.title,
        slug: w.slug,
        description: w.description,
        cover_url: w.cover_url,
        type: w.type,
        access_type: w.access_type,
        full_work_price: w.full_work_price,
        status: w.status,
        rejection_reason: w.rejection_reason,
        created_at: w.created_at,
        published_at: w.published_at,
        author_name: authorInfo?.pen_name || 'Muallif',
        author_id: authorInfo?.user_id,
        chapters: (w.chapters || []).sort(
          (a: any, b: any) => a.chapter_number - b.chapter_number
        ),
        chapters_count: (w.chapters || []).length,
      };
    });

    return NextResponse.json({
      success: true,
      works,
      total: count || works.length,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
