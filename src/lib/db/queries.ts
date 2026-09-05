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
    .eq('status', 'published');

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
    workAccessType: workData.access_type,
    fullWorkPrice: Number(workData.full_work_price || 0),
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
    workAccessType: work.access_type,
    fullWorkPrice: Number(work.full_work_price || 0),
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

export interface PaginatedCatalogueResult {
  works: Work[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Fetch paginated works catalogue with deterministic sorting, count, and filters
 */
export async function getPaginatedCatalogue(options?: {
  page?: number;
  pageSize?: number;
  query?: string;
  genreSlug?: string;
  type?: 'book' | 'serialized_story';
  accessType?: 'free' | 'paid_full_work' | 'paid_by_chapter';
  completionStatus?: 'ongoing' | 'completed';
  sortBy?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
}): Promise<PaginatedCatalogueResult> {
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const supabase = createServerClient();

  let genreWorkIds: string[] | null = null;
  if (options?.genreSlug) {
    const { data: genre } = await supabase
      .from('genres')
      .select('id')
      .eq('slug', options.genreSlug)
      .maybeSingle();

    if (genre) {
      const { data: wgData } = await supabase
        .from('work_genres')
        .select('work_id')
        .eq('genre_id', genre.id);
      genreWorkIds = (wgData || []).map((wg) => wg.work_id);
    } else {
      genreWorkIds = [];
    }
  }

  let q = supabase
    .from('works')
    .select(
      `
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
    `,
      { count: 'exact' },
    )
    .eq('status', 'published');

  if (genreWorkIds !== null) {
    if (genreWorkIds.length === 0) {
      return { works: [], totalCount: 0, totalPages: 0, currentPage: page, pageSize };
    }
    q = q.in('id', genreWorkIds);
  }

  if (options?.query) {
    const rawQ = options.query.trim();
    // Normalize Uzbek apostrophes to wildcard to handle both ' and ’ and `
    const normalized = rawQ.replace(/['`’‘ʻʼ]/g, '%');

    // Also find author user_ids matching the search term
    const { data: matchedAuthors } = await supabase
      .from('author_profiles')
      .select('user_id')
      .ilike('pen_name', `%${normalized}%`);

    const authorIds = (matchedAuthors || []).map((a) => a.user_id);

    if (authorIds.length > 0) {
      q = q.or(
        `title.ilike.%${normalized}%,description.ilike.%${normalized}%,author_id.in.(${authorIds.join(',')})`
      );
    } else {
      q = q.or(`title.ilike.%${normalized}%,description.ilike.%${normalized}%`);
    }
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

  if (options?.sortBy === 'price_asc') {
    q = q.order('full_work_price', { ascending: true }).order('id', { ascending: true });
  } else if (options?.sortBy === 'price_desc') {
    q = q.order('full_work_price', { ascending: false }).order('id', { ascending: true });
  } else {
    q = q.order('published_at', { ascending: false }).order('id', { ascending: true });
  }

  q = q.range(offset, offset + pageSize - 1);

  const { data, count, error } = await q;

  if (error) {
    console.error('Error fetching paginated catalogue:', error);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    works: (data as Work[]) || [],
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
  };
}

/**
 * Fetch genres with published work counts
 */
export async function getGenresWithCounts(): Promise<Array<Genre & { works_count: number }>> {
  const supabase = createServerClient();
  const [genresRes, wgRes] = await Promise.all([
    supabase.from('genres').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('work_genres').select('genre_id, work:works!inner(status, is_archived)').eq('work.status', 'published').neq('work.is_archived', true),
  ]);

  const genres = (genresRes.data as Genre[]) || [];
  const countsMap = new Map<string, number>();

  for (const wg of (wgRes.data || [])) {
    countsMap.set(wg.genre_id, (countsMap.get(wg.genre_id) || 0) + 1);
  }

  return genres.map((g) => ({
    ...g,
    works_count: countsMap.get(g.id) || 0,
  }));
}

/**
 * Fetch public author profile and works by ID, user_id or username
 */
export async function getPublicAuthor(identifier: string) {
  const supabase = createAdminClient();

  // Try finding by user_id first, then id
  let { data: author } = await supabase
    .from('author_profiles')
    .select(`
      *,
      profile:profiles(id, display_name, username, avatar_url)
    `)
    .or(`user_id.eq.${identifier},id.eq.${identifier}`)
    .eq('status', 'approved')
    .maybeSingle();

  // If not found, try finding by username in profiles
  if (!author) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', identifier)
      .maybeSingle();

    if (profile) {
      const { data: authorByProfile } = await supabase
        .from('author_profiles')
        .select(`
          *,
          profile:profiles(id, display_name, username, avatar_url)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .maybeSingle();

      author = authorByProfile;
    }
  }

  if (!author) return null;

  const [worksRes, followersRes] = await Promise.all([
    supabase
      .from('works')
      .select(`
        *,
        work_genres(genre:genres(*))
      `)
      .eq('author_id', author.user_id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('author_follows')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', author.user_id),
  ]);

  const rawWorks = (worksRes.data as any[]) || [];
  // Ensure each work carries the author object so WorkCard displays the real author pen name!
  const works = rawWorks.map((w) => ({
    ...w,
    author: {
      pen_name: author.pen_name,
      biography: author.biography,
      user_id: author.user_id,
    },
  })) as Work[];
  const followerCount = followersRes.count || 0;

  // Calculate total public reads across all author's works
  const totalReads = works.reduce((sum, w) => sum + Number(w.view_count || 0), 0);

  return {
    author,
    works,
    totalWorks: works.length,
    totalReads,
    followerCount,
  };
}

