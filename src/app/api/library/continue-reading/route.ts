import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { canReadChapter } from '@/lib/security/access';

export const dynamic = 'force-dynamic';

function getRelativeTimeString(dateStr: string): string {
  try {
    const past = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - past);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Hozirgina';
    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    if (diffDays === 1) return 'Kecha';
    if (diffDays < 30) return `${diffDays} kun oldin`;
    return `${Math.floor(diffDays / 30)} oy oldin`;
  } catch {
    return 'Yaqinda';
  }
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ items: [], primaryItem: null });
    }

    const admin = createAdminClient();

    // 1. Query reading_progress for the user (most authoritative)
    const { data: progressRows } = await admin
      .from('reading_progress')
      .select(`
        work_id,
        chapter_id,
        page_index,
        percentage,
        is_completed,
        last_read_at,
        work:works (
          id, title, slug, cover_url, access_type, type, full_work_price, status,
          author:author_profiles (pen_name)
        ),
        chapter:chapters (
          id, chapter_number, title, slug, is_free, price, status
        )
      `)
      .eq('user_id', profile.id)
      .order('last_read_at', { ascending: false })
      .limit(5);

    const validProgressItems: any[] = [];
    const seenWorkIds = new Set<string>();

    if (progressRows && progressRows.length > 0) {
      for (const row of progressRows) {
        const w = (row as any).work;
        const c = (row as any).chapter;
        if (!w || w.status !== 'published') continue;
        if (seenWorkIds.has(w.id)) continue;
        seenWorkIds.add(w.id);

        let canRead = true;
        if (c && !c.is_free && c.status === 'published') {
          const accessCheck = await canReadChapter(profile.id, c.id, { customClient: admin });
          canRead = accessCheck.canRead;
        }

        const readUrl = c
          ? canRead
            ? `/asarlar/${w.slug}/${c.slug}${row.page_index > 1 ? `?page=${row.page_index}` : ''}`
            : `/asarlar/${w.slug}`
          : `/asarlar/${w.slug}`;

        validProgressItems.push({
          work_id: w.id,
          work: w,
          last_chapter: c || null,
          page_index: row.page_index || 1,
          reading_progress: row.percentage || 0,
          is_completed: Boolean(row.is_completed || row.percentage >= 100),
          last_read_at: row.last_read_at,
          relative_time: getRelativeTimeString(row.last_read_at),
          read_url: readUrl,
        });
      }
    }

    // 2. Complement with library_items if fewer than 5 works
    if (validProgressItems.length < 5) {
      const remainingLimit = 5 - validProgressItems.length;
      const { data: libRows } = await admin
        .from('library_items')
        .select(`
          work_id,
          saved_state,
          reading_progress,
          updated_at,
          work:works (
            id, title, slug, cover_url, access_type, type, full_work_price, status,
            author:author_profiles (pen_name)
          ),
          last_chapter:chapters!last_read_chapter_id (
            id, chapter_number, title, slug, is_free, price, status
          )
        `)
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(remainingLimit + 5);

      if (libRows) {
        for (const row of libRows) {
          if (validProgressItems.length >= 5) break;
          const w = (row as any).work;
          const c = (row as any).last_chapter;
          if (!w || w.status !== 'published' || seenWorkIds.has(w.id)) continue;
          seenWorkIds.add(w.id);

          let canRead = true;
          if (c && !c.is_free && c.status === 'published') {
            const accessCheck = await canReadChapter(profile.id, c.id, { customClient: admin });
            canRead = accessCheck.canRead;
          }

          const readUrl = c
            ? canRead
              ? `/asarlar/${w.slug}/${c.slug}`
              : `/asarlar/${w.slug}`
            : `/asarlar/${w.slug}`;

          validProgressItems.push({
            work_id: w.id,
            work: w,
            last_chapter: c || null,
            page_index: 1,
            reading_progress: row.reading_progress || 0,
            is_completed: row.saved_state === 'completed',
            last_read_at: row.updated_at,
            relative_time: getRelativeTimeString(row.updated_at),
            read_url: readUrl,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items: validProgressItems,
      primaryItem: validProgressItems[0] || null,
    });
  } catch (err) {
    console.error('Error in /api/library/continue-reading:', err);
    return NextResponse.json({ items: [], primaryItem: null });
  }
}
