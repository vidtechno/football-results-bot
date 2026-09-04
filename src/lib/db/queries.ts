import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import {
  canReadChapter,
  getWorkChaptersAccessMap,
  type ChapterAccessReason,
  type ChapterAccessStatus,
} from '@/lib/security/access';
import type {
  Work,
  Chapter,
  Genre,
  AuthorProfile,
  LibraryItem,
  WalletAccount,
  WalletTransaction,
  TopupRequest,
  PayoutRequest,
  Purchase,
} from '@/lib/types/platform';

/**
 * Fetch active genres sorted by order.
 */
export async function getActiveGenres(): Promise<Genre[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching genres:', error);
    return [];
  }

  return (data as Genre[]) || [];
}

/**
 * Fetch published works with optional search and filters.
 */
export async function getPublishedWorks(options?: {
  query?: string;
  genreSlug?: string;
  type?: 'book' | 'serialized_story';
  accessType?: 'free' | 'paid_full_work' | 'paid_by_chapter';
  completionStatus?: 'ongoing' | 'completed';
  sortBy?: 'popular' | 'newest' | 'price_asc' | 'price_desc';
  limit?: number;
}): Promise<Work[]> {
  const supabase = createServerClient();
  let q = supabase
    .from('works')
    .select(`
      *,
      author:author_profiles (
        user_id,
        pen_name,
        biography,
        status,
        profile:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      ),
      work_genres (
        genre:genres (*)
      )
    `)
    .eq('status', 'published')
    .neq('is_archived', true);

  if (options?.sortBy === 'price_asc') {
    q = q.order('full_work_price', { ascending: true });
  } else if (options?.sortBy === 'price_desc') {
    q = q.order('full_work_price', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false });
  }

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
      .select(`
        *,
        author:author_profiles (
          user_id,
          pen_name,
          biography,
          status,
          profile:profiles (
            id,
            display_name,
            username,
            avatar_url
          )
        ),
        work_genres (
          genre:genres (*)
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (options?.query) {
      fallbackQ = fallbackQ.or(`title.ilike.%${options.query}%,description.ilike.%${options.query}%`);
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
    data = fallbackRes.data;
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

/**
 * Fetch single work by slug with published chapters.
 */
export async function getWorkBySlug(
  slug: string,
  userId?: string | null,
): Promise<{
  work: Work | null;
  chapters: Chapter[];
  chapterAccessMap: Record<string, ChapterAccessStatus>;
}> {
  const supabase = createServerClient();

  const { data: workData, error: workError } = await supabase
    .from('works')
    .select(`
      *,
      author:author_profiles (
        user_id,
        pen_name,
        biography,
        status,
        profile:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      ),
      work_genres (
        genre:genres (*)
      )
    `)
    .eq('slug', slug)
    .single();

  if (workError || !workData) {
    return { work: null, chapters: [], chapterAccessMap: {} };
  }

  const { data: chaptersData } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, is_free, price, status, published_at, created_at, updated_at')
    .eq('work_id', workData.id)
    .eq('status', 'published')
    .order('chapter_number', { ascending: true });

  const chapters = (chaptersData as Chapter[]) || [];

  const chapterAccessMap = await getWorkChaptersAccessMap(userId, workData.id, chapters, {
    authorId: workData.author_id,
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

export interface ChapterReadingData {
  work: Work | null;
  chapter: Chapter | null;
  hasAccess: boolean;
  accessReason: ChapterAccessReason;
  userBalance: number;
  allChapters: Chapter[];
  chapterAccessMap: Record<string, ChapterAccessStatus>;
  savedProgress: { pageIndex: number; percentage: number; chapterId: string } | null;
}

/**
 * Fetch chapter reading content with access validation.
 * Full content is returned ONLY if canReadChapter evaluates to true.
 * Otherwise, content is strictly empty string, returning only safe public metadata.
 */
export async function getChapterForReading(
  workSlug: string,
  chapterSlug: string,
  userId?: string | null,
  options?: { isAdminRoute?: boolean },
): Promise<ChapterReadingData> {
  const supabase = createAdminClient();

  const { data: work } = await supabase
    .from('works')
    .select(`
      *,
      author:author_profiles (
        user_id,
        pen_name,
        biography,
        profile:profiles(id, display_name, username, avatar_url)
      )
    `)
    .eq('slug', workSlug)
    .single();

  if (!work) {
    return {
      work: null,
      chapter: null,
      hasAccess: false,
      accessReason: 'locked',
      userBalance: 0,
      allChapters: [],
      chapterAccessMap: {},
      savedProgress: null,
    };
  }

  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, is_free, price, status, published_at, created_at, updated_at')
    .eq('work_id', work.id)
    .eq('status', 'published')
    .order('chapter_number', { ascending: true });

  const chaptersList = (allChapters as Chapter[]) || [];

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, is_free, price, status, published_at, created_at, updated_at')
    .eq('work_id', work.id)
    .eq('slug', chapterSlug)
    .single();

  if (!chapter) {
    return {
      work,
      chapter: null,
      hasAccess: false,
      accessReason: 'locked',
      userBalance: 0,
      allChapters: chaptersList,
      chapterAccessMap: {},
      savedProgress: null,
    };
  }

  // 1. Authoritative access check via canReadChapter
  const accessResult = await canReadChapter(userId, chapter.id, {
    isAdminRoute: options?.isAdminRoute,
  });

  // 2. Fetch full chapter access map for navigation and TOC
  const chapterAccessMap = await getWorkChaptersAccessMap(userId, work.id, chaptersList, {
    authorId: work.author_id,
  });

  // 3. User balance if authenticated
  let userBalance = 0;
  if (userId) {
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('account_type', 'reader_credit')
      .maybeSingle();

    if (wallet) {
      userBalance = Number(wallet.balance || 0);
    }
  }

  // 4. Reading progress for this work/user if authenticated
  let savedProgress: { pageIndex: number; percentage: number; chapterId: string } | null = null;
  if (userId) {
    const { data: prog } = await supabase
      .from('reading_progress')
      .select('page_index, percentage, chapter_id')
      .eq('user_id', userId)
      .eq('work_id', work.id)
      .maybeSingle();

    if (prog) {
      savedProgress = {
        pageIndex: Number(prog.page_index || 1),
        percentage: Number(prog.percentage || 0),
        chapterId: prog.chapter_id,
      };
    }
  }

  // Strictly sanitized chapter:
  // If accessResult.canRead is false, content is EMPTY STRING ("").
  // Full text is NEVER passed down to client components or RSC props!
  const sanitizedChapter: Chapter = {
    ...chapter,
    content: accessResult.canRead ? accessResult.content : '',
  };

  return {
    work,
    chapter: sanitizedChapter,
    hasAccess: accessResult.canRead,
    accessReason: accessResult.reason,
    userBalance,
    allChapters: chaptersList,
    chapterAccessMap,
    savedProgress,
  };
}

/**
 * Fetch public author profile and their published works.
 */
export async function getAuthorByUsername(username: string): Promise<{
  author: AuthorProfile | null;
  works: Work[];
}> {
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    return { author: null, works: [] };
  }

  const { data: author } = await supabase
    .from('author_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  if (!author || author.status !== 'approved') {
    return { author: null, works: [] };
  }

  const { data: works } = await supabase
    .from('works')
    .select('*')
    .eq('author_id', author.user_id)
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return {
    author: {
      ...author,
      profile,
    },
    works: (works as Work[]) || [],
  };
}

/**
 * Fetch list of approved authors for public directory
 */
export async function getApprovedAuthors(limit = 40): Promise<AuthorProfile[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('author_profiles')
    .select(`
      *,
      profile:profiles(id, display_name, username, avatar_url)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as AuthorProfile[]) || [];
}

