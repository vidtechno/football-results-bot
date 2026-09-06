import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { canReadChapter } from '@/lib/security/access';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workId = searchParams.get('workId');

    const adminClient = createAdminClient();

    let query = adminClient
      .from('reading_bookmarks')
      .select(`
        id,
        user_id,
        work_id,
        chapter_id,
        page_number,
        progress_percent,
        text_anchor,
        created_at,
        updated_at,
        work:works (
          id,
          title,
          slug,
          cover_url,
          type,
          access_type,
          status,
          author:author_profiles (
            pen_name
          )
        ),
        chapter:chapters (
          id,
          title,
          slug,
          chapter_number
        )
      `)
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false });

    if (workId) {
      query = query.eq('work_id', workId);
      const { data, error } = await query.maybeSingle();
      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, bookmark: data });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookmarks: data || [] });
  } catch (err: unknown) {
    console.error('Error fetching bookmarks:', err);
    return NextResponse.json({ success: false, error: 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const body = await request.json();
    const workId = String(body.workId || '').trim();
    const chapterId = String(body.chapterId || '').trim();
    const pageNumber = Math.max(1, Math.floor(Number(body.pageNumber || body.page || 1)));
    const progressPercent = Math.max(0, Math.min(100, Math.round(Number(body.progressPercent || body.progress || 0))));
    const textAnchor = body.textAnchor ? String(body.textAnchor).slice(0, 200) : null;

    if (!workId || !chapterId) {
      return NextResponse.json({ success: false, error: 'Asar va bob talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify chapter exists and belongs to work
    const { data: chapter, error: chapError } = await adminClient
      .from('chapters')
      .select('id, work_id, is_free, price')
      .eq('id', chapterId)
      .eq('work_id', workId)
      .maybeSingle();

    if (chapError || !chapter) {
      return NextResponse.json({ success: false, error: 'Bob topilmadi' }, { status: 404 });
    }

    // Verify authorization to read chapter before bookmarking
    const access = await canReadChapter(profile.id, chapterId, { isAdminRoute: profile.is_admin });
    if (!access.canRead) {
      return NextResponse.json(
        { success: false, error: 'Qulflangan bobga xatcho‘p qo‘yish mumkin emas' },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();

    const { data, error } = await adminClient
      .from('reading_bookmarks')
      .upsert(
        {
          user_id: profile.id,
          work_id: workId,
          chapter_id: chapterId,
          page_number: pageNumber,
          progress_percent: progressPercent,
          text_anchor: textAnchor,
          updated_at: nowIso,
        },
        {
          onConflict: 'user_id,work_id',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookmark: data });
  } catch (err: unknown) {
    console.error('Error saving bookmark:', err);
    return NextResponse.json({ success: false, error: 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workId = searchParams.get('workId');
    const bookmarkId = searchParams.get('id');

    if (!workId && !bookmarkId) {
      return NextResponse.json({ success: false, error: 'workId yoki id talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from('reading_bookmarks')
      .delete()
      .eq('user_id', profile.id);

    if (bookmarkId) {
      query = query.eq('id', bookmarkId);
    } else if (workId) {
      query = query.eq('work_id', workId);
    }

    const { error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting bookmark:', err);
    return NextResponse.json({ success: false, error: 'Xatolik yuz berdi' }, { status: 500 });
  }
}
