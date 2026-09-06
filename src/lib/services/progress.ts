import { createAdminClient } from '@/lib/supabase/server';
import { canReadChapter } from '@/lib/security/access';

export interface ReadingProgressItem {
  id: string;
  workId: string;
  work: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    authorName: string;
    accessType: string;
    type: string;
    status: string;
  };
  chapterId: string | null;
  chapter: {
    id: string;
    number: number;
    title: string;
    slug: string;
    isFree: boolean;
    price: number;
  } | null;
  pageIndex: number;
  percentage: number;
  isCompleted: boolean;
  lastReadAt: string;
  relativeTime: string;
  resumeUrl: string;
}

export function formatUzbekRelativeTime(dateStr: string): string {
  try {
    const past = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - past);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Hozirgina o‘qildi';
    if (diffMins < 60) return `${diffMins} daqiqa oldin o‘qildi`;
    if (diffHours < 24) return `${diffHours} soat oldin o‘qildi`;
    if (diffDays === 1) return 'Kecha o‘qilgandi';
    if (diffDays < 30) return `${diffDays} kun oldin o‘qilgandi`;
    return `${Math.floor(diffDays / 30)} oy oldin o‘qilgandi`;
  } catch {
    return 'Yaqinda o‘qilgandi';
  }
}

/**
 * Shared, canonical server query for recent reading progress.
 * Returns up to `limit` distinct works ordered by latest read timestamp.
 * Strictly deduplicates works and generates authoritative canonical resume URLs.
 */
export async function getRecentReadingProgress(
  userId: string,
  limit: number = 5,
  customClient?: any,
): Promise<ReadingProgressItem[]> {
  if (!userId) return [];

  const admin = customClient || createAdminClient();

  const { data: rows, error } = await admin
    .from('reading_progress')
    .select(`
      id,
      work_id,
      chapter_id,
      page_index,
      percentage,
      is_completed,
      last_read_at,
      work:works (
        id,
        title,
        slug,
        cover_url,
        access_type,
        type,
        full_work_price,
        status,
        author:author_profiles (pen_name)
      ),
      chapter:chapters (
        id,
        chapter_number,
        title,
        slug,
        is_free,
        price,
        status
      )
    `)
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(limit * 4); // Fetch extra buffer for deduplication & published status filtering

  if (error || !rows) {
    console.error('Error in getRecentReadingProgress:', error);
    return [];
  }

  const items: ReadingProgressItem[] = [];
  const seenWorkIds = new Set<string>();

  for (const row of rows) {
    if (items.length >= limit) break;

    const w = (row as any).work;
    const c = (row as any).chapter;

    if (!w || w.status !== 'published') continue;
    if (seenWorkIds.has(w.id)) continue;
    seenWorkIds.add(w.id);

    const isFreeWork = w.access_type === 'free';
    let canRead = isFreeWork;

    if (!canRead && c && c.status === 'published') {
      const accessCheck = await canReadChapter(userId, c.id, { customClient: admin });
      canRead = accessCheck.canRead;
    }

    const pageIndex = Number(row.page_index || 1);
    const resumeUrl = c
      ? canRead
        ? `/asarlar/${w.slug}/${c.slug}${pageIndex > 1 ? `?page=${pageIndex}` : ''}`
        : `/asarlar/${w.slug}/${c.slug}`
      : `/asarlar/${w.slug}`;

    const authorName = (w.author as any)?.pen_name || 'Muallif';

    items.push({
      id: row.id,
      workId: w.id,
      work: {
        id: w.id,
        title: w.title,
        slug: w.slug,
        coverUrl: w.cover_url || null,
        authorName,
        accessType: w.access_type,
        type: w.type,
        status: w.status,
      },
      chapterId: c?.id || null,
      chapter: c
        ? {
            id: c.id,
            number: c.chapter_number,
            title: c.title,
            slug: c.slug,
            isFree: isFreeWork || Boolean(c.is_free),
            price: isFreeWork ? 0 : Number(c.price || 0),
          }
        : null,
      pageIndex,
      percentage: Number(row.percentage || 0),
      isCompleted: Boolean(row.is_completed || Number(row.percentage || 0) >= 100),
      lastReadAt: row.last_read_at,
      relativeTime: formatUzbekRelativeTime(row.last_read_at),
      resumeUrl,
    });
  }

  return items;
}
