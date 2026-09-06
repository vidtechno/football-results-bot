import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ items: [] });
    }

    const admin = createAdminClient();
    const { data: libData } = await admin
      .from('library_items')
      .select(`
        work_id,
        saved_state,
        reading_progress,
        updated_at,
        work:works (
          id, title, slug, cover_url, access_type, type,
          author:author_profiles (pen_name)
        ),
        last_chapter:chapters!last_read_chapter_id (
          id, chapter_number, title, slug
        )
      `)
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(3);

    const items = (libData || []).filter((item: any) => item.work);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
