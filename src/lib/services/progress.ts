import { createAdminClient } from '@/lib/supabase/server';
import { canReadChapter } from '@/lib/security/access';

export interface RecentReadingProgressDTO {
  workId: string;
  workSlug: string;
  workTitle: string;
  coverUrl: string | null;

  authorId: string | null;
  authorName: string;

  chapterId: string;
  chapterSlug: string;
  chapterNumber: number;
  chapterTitle: string;

  pageNumber: number;
  pageIndex?: number;
  totalPages: number | null;
  progressPercent: number;

  lastReadAt: string;
  lastReadLabel: string;
  resumeUrl: string;

  // Compatibility fields for legacy consumers
  id: string;
  work_id: string;
  page_index: number;
  reading_progress: number;
  percentage: number;
  is_completed: boolean;
  isCompleted: boolean;
  relative_time: string;
  relativeTime: string;
  read_url: string;
  resume_url: string;
  work: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    cover_url: string | null;
    authorName: string;
    author?: {
      pen_name: string;
    };
    accessType: string;
    access_type: string;
    type: string;
    status: string;
  };
  chapter: {
    id: string;
    number: number;
    chapter_number: number;
    title: string;
    slug: string;
    isFree: boolean;
    is_free: boolean;
    price: number;
  } | null;
  last_chapter?: {
    id: string;
    number: number;
    chapter_number: number;
    title: string;
    slug: string;
    isFree: boolean;
    is_free: boolean;
    price: number;
  } | null;
}

export type ReadingProgressItem = RecentReadingProgressDTO;

/**
 * Shared Uzbek relative time formatter.
 * Always returns a single, complete phrase ending in "o‘qilgandi".
 * Consumers must not append another "o‘qildi" or "o‘qilgandi".
 */
export function formatUzbekRelativeTime(dateStr: string): string {
  try {
    const past = new Date(dateStr).getTime();
    if (isNaN(past)) return 'Yaqinda o‘qilgandi';
    const now = Date.now();
    const diffMs = Math.max(0, now - past);
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Hozirgina o‘qilgandi';
    if (diffMins < 60) return `${diffMins} daqiqa oldin o‘qilgandi`;
    if (diffHours < 24) return `${diffHours} soat oldin o‘qilgandi`;
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
): Promise<RecentReadingProgressDTO[]> {
  if (!userId) return [];

  const admin = customClient || createAdminClient();

  const { data: rows, error } = await admin
    .from('reading_progress')
    .select(`
      id,
      work_id,
      chapter_id,
      page_index,
      total_pages,
      percentage,
      is_completed,
      last_read_at,
      work:works (
        id,
        title,
        slug,
        cover_url,
        author_id,
        is_translation,
        is_plus,
        original_author_name,
        credited_author_name,
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

  // Fallback lookup if any author pen_name was not joined
  const missingAuthorIds: string[] = [];
  for (const row of rows) {
    const w = (row as any).work;
    if (w && w.author_id) {
      const authorObj = Array.isArray(w.author) ? w.author[0] : w.author;
      if (!authorObj?.pen_name) {
        missingAuthorIds.push(w.author_id);
      }
    }
  }

  const authorNameMap = new Map<string, string>();
  if (missingAuthorIds.length > 0) {
    try {
      const query = admin.from('author_profiles').select('user_id, pen_name');
      if (query && typeof query.in === 'function') {
        const { data: authorData } = await query.in('user_id', Array.from(new Set(missingAuthorIds)));
        (authorData || []).forEach((a: any) => {
          if (a.user_id && a.pen_name) {
            authorNameMap.set(a.user_id, a.pen_name);
          }
        });
      }
    } catch {
      // Fallback gracefully if mock or relation doesn't support query
    }
  }

  const items: RecentReadingProgressDTO[] = [];
  const seenWorkIds = new Set<string>();

  for (const row of rows) {
    if (items.length >= limit) break;

    const w = (row as any).work;
    const c = (row as any).chapter;

    if (!w || w.status !== 'published') continue;
    if (seenWorkIds.has(w.id)) continue;
    seenWorkIds.add(w.id);

    const isFreeWork = w.access_type === 'free' && !w.is_plus;
    let canRead = isFreeWork;

    if (!canRead && c && c.status === 'published') {
      const accessCheck = await canReadChapter(userId, c.id, { customClient: admin });
      canRead = accessCheck.canRead;
    }

    // Canonical one-based page number
    const rawPage = Number(row.page_index ?? 1);
    const pageNumber = Math.max(1, isNaN(rawPage) ? 1 : Math.floor(rawPage));
    const rawTotal = row.total_pages ? Number(row.total_pages) : null;
    const totalPages = rawTotal && !isNaN(rawTotal) ? Math.max(1, Math.floor(rawTotal)) : null;

    // Canonical percentage (0 - 100)
    const rawPercent = Number(row.percentage ?? 0);
    const progressPercent = Math.min(100, Math.max(0, isNaN(rawPercent) ? 0 : Math.round(rawPercent)));

    // Canonical URL with preserved one-based page parameter
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(pageNumber));
    const resumeUrl = c
      ? `/asarlar/${encodeURIComponent(w.slug)}/${encodeURIComponent(c.slug)}?${searchParams.toString()}`
      : `/asarlar/${encodeURIComponent(w.slug)}`;

    // Author Name resolution
    const authorObj = Array.isArray(w.author) ? w.author[0] : w.author;
    const authorName = (
      w.credited_author_name ||
      (w.is_translation
        ? w.original_author_name
        : authorObj?.pen_name || authorNameMap.get(w.author_id) || 'Muallif')
    ).trim();

    // Chapter Number resolution
    const rawChapNum = c?.chapter_number ? Number(c.chapter_number) : 1;
    const chapterNumber = isNaN(rawChapNum) ? 1 : rawChapNum;
    const chapterTitle = (c?.title || 'Mutolaa').trim();

    const lastReadLabel = formatUzbekRelativeTime(row.last_read_at);
    const isCompleted = Boolean(row.is_completed || progressPercent >= 100);

    const chapterPayload = c
      ? {
          id: c.id,
          number: chapterNumber,
          chapter_number: chapterNumber,
          title: chapterTitle,
          slug: c.slug,
          isFree: isFreeWork || Boolean(c.is_free),
          is_free: isFreeWork || Boolean(c.is_free),
          price: isFreeWork ? 0 : Number(c.price || 0),
        }
      : null;

    const dto: RecentReadingProgressDTO = {
      workId: w.id,
      workSlug: w.slug,
      workTitle: w.title,
      coverUrl: w.cover_url || null,

      authorId: w.author_id || null,
      authorName,

      chapterId: c?.id || '',
      chapterSlug: c?.slug || '',
      chapterNumber,
      chapterTitle,

      pageNumber,
      pageIndex: pageNumber,
      totalPages,
      progressPercent,

      lastReadAt: row.last_read_at,
      lastReadLabel,
      resumeUrl,

      // Compatibility fields
      id: row.id,
      work_id: w.id,
      page_index: pageNumber,
      reading_progress: progressPercent,
      percentage: progressPercent,
      is_completed: isCompleted,
      isCompleted,
      relative_time: lastReadLabel,
      relativeTime: lastReadLabel,
      read_url: resumeUrl,
      resume_url: resumeUrl,
      work: {
        id: w.id,
        title: w.title,
        slug: w.slug,
        coverUrl: w.cover_url || null,
        cover_url: w.cover_url || null,
        authorName,
        author: {
          pen_name: authorName,
        },
        accessType: w.access_type,
        access_type: w.access_type,
        type: w.type,
        status: w.status,
      },
      chapter: chapterPayload,
      last_chapter: chapterPayload,
    };

    items.push(dto);
  }

  return items;
}
