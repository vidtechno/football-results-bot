import { unstable_cache } from 'next/cache';
import { createCatalogueClient } from '@/lib/supabase/catalogue';
import { getWorkChaptersAccessMap, type ChapterAccessStatus } from '@/lib/security/access';
import type { Work, Chapter } from '@/lib/types/platform';
import { getRelativeTimeString } from '@/lib/utils/formatters';

/**
 * Fetch published works with optional search and filters.
 */
export async function getPublishedWorks(options?: {
  query?: string;
  genreSlug?: string;
  type?: 'book' | 'serialized_story';
  accessType?: 'free' | 'paid_full_work' | 'paid_by_chapter';
  completionStatus?: 'ongoing' | 'completed';
  sortBy?: 'popular' | 'newest' | 'rating' | 'updated' | 'price_asc' | 'price_desc';
  isFeatured?: boolean;
  isPlus?: boolean;
  limit?: number;
}): Promise<Work[]> {
  const supabase = createCatalogueClient();
  let q = supabase
    .from('works')
    .select(
      `
      id,
      author_id,
      title,
      slug,
      description,
      cover_url,
      type,
      status,
      access_type,
      full_work_price,
      age_rating,
      completion_status,
      language,
      is_translation,
      is_plus,
      original_title,
      original_author_name,
      credited_author_name,
      source_language,
      translator_name,
      translation_rights_basis,
      is_archived,
      is_featured,
      total_words,
      average_rating,
      rating_count,
      view_count,
      unique_readers_count,
      sales_count,
      published_at,
      created_at,
      updated_at,
      author:author_profiles (
        user_id,
        pen_name,
        status,
        profile:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      ),
      work_genres (
        genre:genres (id, name, slug)
      )
    `,
    )
    .eq('status', 'published')
    .eq('is_archived', false);

  if (options?.sortBy === 'price_asc') {
    q = q.order('full_work_price', { ascending: true });
  } else if (options?.sortBy === 'price_desc') {
    q = q.order('full_work_price', { ascending: false });
  } else if (options?.sortBy === 'popular') {
    q = q.order('view_count', { ascending: false }).order('published_at', { ascending: false });
  } else if (options?.sortBy === 'rating') {
    q = q.order('average_rating', { ascending: false }).order('rating_count', { ascending: false });
  } else if (options?.sortBy === 'updated') {
    q = q.order('updated_at', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false });
  }

  if (options?.isFeatured !== undefined) {
    q = q.eq('is_featured', options.isFeatured);
  }
  if (options?.isPlus !== undefined) q = q.eq('is_plus', options.isPlus);

  if (options?.query) {
    q = q.or(`title.ilike.%${options.query}%,description.ilike.%${options.query}%`);
  }

  if (options?.type) {
    q = q.eq('type', options.type);
  }

  if (options?.accessType) {
    q = q.eq('access_type', options.accessType);
  }

  if (options?.completionStatus) {
    q = q.eq('completion_status', options.completionStatus);
  }

  if (options?.limit) {
    q = q.limit(options.limit);
  }

  let { data, error } = await q;

  // Graceful compatibility fallback if migration 012 has not yet been applied to production Supabase
  if (error && error.code === '42703') {
    let fallbackQ = supabase
      .from('works')
      .select(
        `
        id,
        author_id,
        title,
        slug,
        description,
        cover_url,
        type,
        status,
        access_type,
        full_work_price,
        age_rating,
        completion_status,
        language,
        is_translation,
        is_plus,
        original_title,
        original_author_name,
        credited_author_name,
        source_language,
        translator_name,
        translation_rights_basis,
        is_archived,
        is_featured,
        total_words,
        average_rating,
        rating_count,
        view_count,
        published_at,
        created_at,
        updated_at,
        author:author_profiles (
          user_id,
          pen_name,
          status,
          profile:profiles (
            id,
            display_name,
            username,
            avatar_url
          )
        ),
        work_genres (
          genre:genres (id, name, slug)
        )
      `,
      )
      .eq('status', 'published')
      .eq('is_archived', false)
      .order('published_at', { ascending: false });

    if (options?.query) {
      fallbackQ = fallbackQ.or(
        `title.ilike.%${options.query}%,description.ilike.%${options.query}%`,
      );
    }
    if (options?.type) {
      fallbackQ = fallbackQ.eq('type', options.type);
    }
    if (options?.accessType) {
      fallbackQ = fallbackQ.eq('access_type', options.accessType);
    }
    if (options?.completionStatus) {
      fallbackQ = fallbackQ.eq('completion_status', options.completionStatus);
    }
    if (options?.limit) {
      fallbackQ = fallbackQ.limit(options.limit);
    }

    const fallbackRes = await fallbackQ;
    data = fallbackRes.data as unknown as typeof data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('Error fetching works:', error);
    return [];
  }

  // Format genres from join
  return (data || []).map((w: any) => ({
    ...w,
    genres: (w.work_genres || []).map((wg: any) => wg.genre).filter(Boolean),
  })) as Work[];
}

export const getPublishedPlusWorkCount = unstable_cache(
  async (): Promise<number> => {
    const { count, error } = await createCatalogueClient()
      .from('works')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('is_archived', false)
      .eq('is_plus', true);
    if (error) {
      console.error('Error counting Plus works:', error);
      return 0;
    }
    return count || 0;
  },
  ['public-plus-work-count-v1'],
  { revalidate: 60, tags: ['public-catalogue'] },
);

/**
 * Fetch single work by slug with published chapters.
 */
const getCachedPublicWorkBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createCatalogueClient();
    const { data } = await supabase
      .from('works')
      .select(
        `
      *,
      author:author_profiles (
        user_id,
        pen_name,
        biography,
        status,
        profile:profiles (id, display_name, username, avatar_url)
      ),
      work_genres (genre:genres (id, name, slug))
    `,
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    return data || null;
  },
  ['public-work-by-slug-v2'],
  { revalidate: 60, tags: ['public-catalogue'] },
);

const getCachedPublicChapters = unstable_cache(
  async (workId: string) => {
    const supabase = createCatalogueClient();
    const { data } = await supabase
      .from('chapters')
      .select(
        'id, work_id, chapter_number, title, slug, is_free, is_preview_free, price, status, published_at, created_at, updated_at',
      )
      .eq('work_id', workId)
      .eq('status', 'published')
      .order('chapter_number', { ascending: true });
    return data || [];
  },
  ['public-work-chapters-v2'],
  { revalidate: 60, tags: ['public-catalogue'] },
);

export async function getWorkBySlug(
  slug: string,
  userId?: string | null,
  isAdmin = false,
): Promise<{
  work: Work | null;
  chapters: Chapter[];
  chapterAccessMap: Record<string, ChapterAccessStatus>;
}> {
  const workData = await getCachedPublicWorkBySlug(slug);
  if (!workData) {
    return { work: null, chapters: [], chapterAccessMap: {} };
  }
  const chapters = (await getCachedPublicChapters(workData.id)) as Chapter[];

  const chapterAccessMap = await getWorkChaptersAccessMap(userId, workData.id, chapters, {
    authorId: workData.author_id,
    workAccessType: workData.access_type,
    fullWorkPrice: Number(workData.full_work_price || 0),
    workIsPlus: Boolean(workData.is_plus),
    isAdmin,
  });

  const work: Work = {
    ...workData,
    genres: (workData.work_genres || []).map((wg: any) => wg.genre).filter(Boolean),
    chapters_count: chapters.length,
  };

  return {
    work,
    chapters,
    chapterAccessMap,
  };
}

/**
 * Lightweight metadata lookup for SEO and header generation.
 * Fetches only what <title> and openGraph need without loading chapters or access maps.
 */
export async function getWorkMetadataBySlug(slug: string): Promise<{
  work: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    status: string;
    type: string;
    access_type: string;
    full_work_price: number;
    age_rating: string | null;
    language: string | null;
    is_translation: boolean;
    original_title: string | null;
    original_author_name: string | null;
    credited_author_name: string | null;
    translator_name: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
    genres: Array<{ id: string; name: string; slug: string }>;
    authorName: string;
    authorUsername?: string;
  } | null;
}> {
  const work = await getCachedPublicWorkBySlug(slug);

  if (!work) return { work: null };

  const authorProfile = Array.isArray(work.author) ? work.author[0] : work.author;
  const authorName =
    work.credited_author_name ||
    (work.is_translation ? work.original_author_name : authorProfile?.pen_name) ||
    'Muallif';
  const authorUsername =
    work.credited_author_name || work.is_translation
      ? undefined
      : (authorProfile?.profile as any)?.username;

  return {
    work: {
      id: work.id,
      title: work.title,
      slug: work.slug,
      description: work.description,
      cover_url: work.cover_url,
      status: work.status,
      type: work.type,
      access_type: work.access_type,
      full_work_price: Number(work.full_work_price || 0),
      age_rating: work.age_rating,
      language: work.language,
      is_translation: Boolean(work.is_translation),
      original_title: work.original_title,
      original_author_name: work.original_author_name,
      credited_author_name: work.credited_author_name,
      translator_name: work.translator_name,
      published_at: work.published_at,
      created_at: work.created_at,
      updated_at: work.updated_at,
      genres: (work.work_genres || []).map((item: any) => item.genre).filter(Boolean),
      authorName,
      authorUsername,
    },
  };
}

export interface RecentChapterItem {
  id: string;
  title: string;
  slug: string;
  chapter_number: number;
  published_at: string | null;
  created_at: string;
  is_free: boolean;
  price: number;
  work: {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    access_type: string;
    type: string;
    is_translation?: boolean;
    original_author_name?: string | null;
    credited_author_name?: string | null;
    author?: {
      pen_name: string;
    };
  };
  relative_time: string;
}

/**
 * Fetch recently published chapters for the "Shu hafta yangi boblar" section.
 * Only returns chapters belonging to active published works.
 */
export async function getRecentChapters(limit = 8): Promise<RecentChapterItem[]> {
  const supabase = createCatalogueClient();
  const { data, error } = await supabase
    .from('chapters')
    .select(
      `
      id,
      title,
      slug,
      chapter_number,
      published_at,
      created_at,
      is_free,
      price,
      status,
      work:works!inner (
        id,
        title,
        slug,
        cover_url,
        access_type,
        type,
        is_translation,
        is_plus,
        original_author_name,
        credited_author_name,
        status,
        author:author_profiles (
          pen_name
        )
      )
    `,
    )
    .eq('status', 'published')
    .eq('work.status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    // Fallback if join has any syntax nuance on older client
    const fallback = await supabase
      .from('chapters')
      .select(
        `
        id,
        title,
        slug,
        chapter_number,
        published_at,
        created_at,
        is_free,
        price,
        status,
        work:works (
          id,
          title,
          slug,
          cover_url,
          access_type,
          type,
          is_translation,
          is_plus,
          original_author_name,
          credited_author_name,
          status,
          author:author_profiles (
            pen_name
          )
        )
      `,
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (fallback.error || !fallback.data) {
      console.error('Error fetching recent chapters:', error || fallback.error);
      return [];
    }

    return (fallback.data as any[])
      .filter((row) => row.work && row.work.status === 'published')
      .map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        chapter_number: row.chapter_number,
        published_at: row.published_at,
        created_at: row.created_at,
        is_free: row.is_free,
        price: row.price,
        work: row.work,
        relative_time: getRelativeTimeString(row.published_at || row.created_at),
      }));
  }

  return (data as any[])
    .filter((row) => row.work && row.work.status === 'published')
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      chapter_number: row.chapter_number,
      published_at: row.published_at,
      created_at: row.created_at,
      is_free: row.is_free,
      price: row.price,
      work: row.work,
      relative_time: getRelativeTimeString(row.published_at || row.created_at),
    }));
}
