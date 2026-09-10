import * as React from 'react';
import { unstable_cache } from 'next/cache';
import { createCatalogueClient } from '@/lib/supabase/catalogue';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import {
  canReadChapter,
  getWorkChaptersAccessMap,
  evaluateCanonicalChapterAccess,
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

import { getRelativeTimeString } from '@/lib/utils/formatters';

const requestCache: <T extends (...args: any[]) => any>(fn: T) => T =
  typeof (React as any).cache === 'function'
    ? (React as any).cache
    : <T extends (...args: any[]) => any>(fn: T): T => fn;

/**
 * Fetch active genres sorted by order.
 */
export async function getActiveGenres(): Promise<Genre[]> {
  const supabase = createCatalogueClient();
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
  sortBy?: 'popular' | 'newest' | 'rating' | 'updated' | 'price_asc' | 'price_desc';
  isFeatured?: boolean;
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
      original_title,
      original_author_name,
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
    .eq('status', 'published');

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
        original_title,
        original_author_name,
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

export interface ChapterReadingData {
  work: Work | null;
  chapter: Chapter | null;
  hasAccess: boolean;
  accessReason: ChapterAccessReason;
  userBalance: number;
  allChapters: Chapter[];
  chapterAccessMap: Record<string, ChapterAccessStatus>;
  savedProgress: {
    pageIndex: number;
    percentage: number;
    chapterId: string;
    lastReadAt?: string | null;
    last_read_at?: string | null;
    timestamp?: number;
  } | null;
}

/**
 * Shared request-level reader lookup. generateMetadata and the page render run in
 * the same request; caching this pair prevents both from independently fetching
 * the same work and chapter list from Supabase.
 */
const getReaderWorkAndChapters = requestCache(async function getReaderWorkAndChapters(
  workSlug: string,
): Promise<{ work: Work | null; chapters: Chapter[] }> {
  const supabase = createAdminClient();
  const { data: work } = await supabase
    .from('works')
    .select(
      `
      *,
      author:author_profiles (
        user_id,
        pen_name,
        biography,
        profile:profiles(id, display_name, username, avatar_url)
      ),
      chapters (
        id,
        work_id,
        chapter_number,
        title,
        slug,
        is_free,
        is_preview_free,
        price,
        status,
        published_at,
        created_at,
        updated_at
      )
    `,
    )
    .eq('slug', workSlug)
    .eq('chapters.status', 'published')
    .order('chapter_number', { referencedTable: 'chapters', ascending: true })
    .maybeSingle();

  if (!work) return { work: null, chapters: [] };

  const { chapters = [], ...workWithoutChapters } = work as any;

  return {
    work: workWithoutChapters as Work,
    chapters: chapters as Chapter[],
  };
});

export async function getChapterMetadata(
  workSlug: string,
  chapterSlug: string,
): Promise<{
  work: Work | null;
  chapter: Pick<Chapter, 'title' | 'chapter_number' | 'slug'> | null;
}> {
  const { work, chapters } = await getReaderWorkAndChapters(workSlug);
  if (!work || work.status !== 'published') return { work: null, chapter: null };
  const chapter = chapters.find((item: Chapter) => item.slug === chapterSlug) || null;
  return { work, chapter };
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
    language: string | null;
    is_translation: boolean;
    original_title: string | null;
    original_author_name: string | null;
    translator_name: string | null;
    authorName: string;
    authorUsername?: string;
  } | null;
}> {
  const work = await getCachedPublicWorkBySlug(slug);

  if (!work) return { work: null };

  const authorProfile = Array.isArray(work.author) ? work.author[0] : work.author;
  const authorName =
    authorProfile?.pen_name ||
    (work.is_translation ? work.original_author_name : 'Muallif') ||
    'Muallif';
  const authorUsername = (authorProfile?.profile as any)?.username;

  return {
    work: {
      id: work.id,
      title: work.title,
      slug: work.slug,
      description: work.description,
      cover_url: work.cover_url,
      status: work.status,
      language: work.language,
      is_translation: Boolean(work.is_translation),
      original_title: work.original_title,
      original_author_name: work.original_author_name,
      translator_name: work.translator_name,
      authorName,
      authorUsername,
    },
  };
}

/**
 * Fetch chapter reading content with optimized access validation.
 * Queries work and chapters once, determines access and access map in-memory,
 * and queries chapter_contents.content ONLY if the reader is fully authorized.
 */
export async function getChapterForReading(
  workSlug: string,
  chapterSlug: string,
  userId?: string | null,
  options?: { isAdmin?: boolean },
): Promise<ChapterReadingData> {
  const supabase = createAdminClient();

  // Shared with generateMetadata during this request, avoiding duplicate reads.
  const { work, chapters: allChapters } = await getReaderWorkAndChapters(workSlug);

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

  // Find current chapter locally from already-fetched chapters.
  const currentChapter = allChapters.find((c: Chapter) => c.slug === chapterSlug) || null;

  if (!currentChapter) {
    return {
      work,
      chapter: null,
      hasAccess: false,
      accessReason: 'locked',
      userBalance: 0,
      allChapters,
      chapterAccessMap: {},
      savedProgress: null,
    };
  }

  // 4. Determine user entitlements and authorization
  const isWorkPublished = work.status === 'published';
  const isCurrentChapterPublished = currentChapter.status === 'published';

  let hasFullWorkEntitlement = false;
  const purchasedChapterIds = new Set<string>();
  let userBalance = 0;
  let savedProgress: ChapterReadingData['savedProgress'] = null;
  let isAuthor = false;
  let isAdmin = false;

  if (userId) {
    isAuthor = work.author_id === userId;

    // Parallel fetch of authenticated reader state. The already-resolved profile
    // supplies admin state, so this path does not query profiles a second time.
    const [entRes, walletRes, progRes] = await Promise.all([
      supabase
        .from('entitlements')
        .select('entitlement_type, chapter_id')
        .eq('user_id', userId)
        .eq('work_id', work.id),
      supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('user_id', userId)
        .eq('account_type', 'reader_credit')
        .maybeSingle(),
      supabase
        .from('reading_progress')
        .select('page_index, percentage, chapter_id, last_read_at')
        .eq('user_id', userId)
        .eq('work_id', work.id)
        .maybeSingle(),
    ]);

    isAdmin = Boolean(options?.isAdmin);

    const entitlements = entRes.data || [];
    // Entitlements are canonical after migration 032. Query legacy purchases only
    // when no entitlement exists, preserving old accounts without taxing every read.
    let rawPurchases: any[] = [];
    if (entitlements.length === 0) {
      const purRes = await supabase
        .from('purchases')
        .select('purchase_type, chapter_id, status')
        .eq('buyer_id', userId)
        .eq('work_id', work.id);
      rawPurchases = purRes.data || [];
    }
    const activePurchases = rawPurchases.filter((p: any) =>
      ['active', 'completed', 'paid'].includes(p.status),
    );

    hasFullWorkEntitlement =
      entitlements.some((e: any) => e.entitlement_type === 'full_work') ||
      activePurchases.some((p: any) => p.purchase_type === 'full_work');

    for (const e of entitlements) {
      if (e.chapter_id) purchasedChapterIds.add(e.chapter_id);
    }
    for (const p of activePurchases) {
      if (p.chapter_id) purchasedChapterIds.add(p.chapter_id);
    }

    userBalance = Number(walletRes.data?.balance || 0);

    const prog = progRes.data;
    if (prog) {
      savedProgress = {
        pageIndex: Number(prog.page_index || 1),
        percentage: Number(prog.percentage || 0),
        chapterId: prog.chapter_id,
        lastReadAt: prog.last_read_at || null,
        last_read_at: prog.last_read_at || null,
      };
    }
  }

  // 5. Evaluate canonical access for requested chapter in-memory
  const accessEval = evaluateCanonicalChapterAccess({
    workAccessType: work.access_type,
    fullWorkPrice: Number(work.full_work_price || 0),
    chapterIsFree: currentChapter.is_free,
    chapterIsPreviewFree: currentChapter.is_preview_free,
    chapterPrice: Number(currentChapter.price || 0),
    isWorkPublished,
    isChapterPublished: isCurrentChapterPublished,
    isAuthor,
    isAdmin,
    hasFullWorkEntitlement,
    hasChapterEntitlement: purchasedChapterIds.has(currentChapter.id),
  });

  // 6. Compute chapter access map for all chapters entirely in-memory (0 extra queries)
  const chapterAccessMap: Record<string, ChapterAccessStatus> = {};
  for (const ch of allChapters) {
    const chEval = evaluateCanonicalChapterAccess({
      workAccessType: work.access_type,
      fullWorkPrice: Number(work.full_work_price || 0),
      chapterIsFree: ch.is_free,
      chapterIsPreviewFree: ch.is_preview_free,
      chapterPrice: Number(ch.price || 0),
      isWorkPublished,
      isChapterPublished: ch.status === 'published',
      isAuthor,
      isAdmin,
      hasFullWorkEntitlement,
      hasChapterEntitlement: purchasedChapterIds.has(ch.id),
    });

    let accessReason: ChapterAccessStatus['accessReason'] = 'locked';
    if (chEval.reason === 'free') accessReason = 'free';
    else if (chEval.reason === 'author') accessReason = 'author';
    else if (chEval.reason === 'admin_preview') accessReason = 'admin';
    else if (chEval.reason === 'purchased_chapter' || chEval.reason === 'purchased_full_work')
      accessReason = 'purchased';

    chapterAccessMap[ch.id] = {
      isFree: chEval.isFree,
      isPurchased: chEval.reason === 'purchased_chapter' || chEval.reason === 'purchased_full_work',
      isLocked: chEval.isLocked,
      price: chEval.price,
      accessReason,
    };
  }

  // 7. CRITICAL CONTENT AUTHORIZATION SECURITY:
  // ONLY query chapter_contents.content IF accessEval.canRead evaluates to true.
  // Locked paid chapter content is NEVER selected, serialized in HTML or returned in RSC props!
  let content = '';
  if (accessEval.canRead) {
    const { data: contentData } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', currentChapter.id)
      .maybeSingle();

    content = contentData?.content || '';
  }

  const sanitizedChapter: Chapter = {
    ...currentChapter,
    content,
  };

  return {
    work,
    chapter: sanitizedChapter,
    hasAccess: accessEval.canRead,
    accessReason: accessEval.reason,
    userBalance,
    allChapters,
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
    .eq('is_translation', false)
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
    .select(
      `
      *,
      profile:profiles(id, display_name, username, avatar_url)
    `,
    )
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
  collection?: string;
  isTranslation?: boolean;
  sourceLanguage?: string;
}): Promise<PaginatedCatalogueResult> {
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const supabase = createCatalogueClient();

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

  // The general catalogue remains compatible before migration 039; only its
  // new ranking filters require the counters.
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
      original_title,
      original_author_name,
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
        `title.ilike.%${normalized}%,description.ilike.%${normalized}%,original_author_name.ilike.%${normalized}%,translator_name.ilike.%${normalized}%,author_id.in.(${authorIds.join(',')})`,
      );
    } else {
      q = q.or(
        `title.ilike.%${normalized}%,description.ilike.%${normalized}%,original_author_name.ilike.%${normalized}%,translator_name.ilike.%${normalized}%`,
      );
    }
  }

  if (options?.isTranslation !== undefined) {
    q = q.eq('is_translation', options.isTranslation);
  }

  if (options?.sourceLanguage) {
    q = q.eq('source_language', options.sourceLanguage);
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

  // Curated collections logic
  if (options?.collection) {
    switch (options.collection) {
      case 'ommabop':
        q = q
          .order('view_count', { ascending: false })
          .order('average_rating', { ascending: false });
        break;
      case 'eng_kop_oqilgan':
        q = q
          .gt('unique_readers_count', 0)
          .order('unique_readers_count', { ascending: false })
          .order('view_count', { ascending: false });
        break;
      case 'bestseller':
        q = q
          .eq('access_type', 'paid_full_work')
          .gt('sales_count', 0)
          .order('sales_count', { ascending: false });
        break;
      case 'kitobxonlar_sevgan':
        q = q
          .gt('rating_count', 0)
          .order('average_rating', { ascending: false })
          .order('rating_count', { ascending: false });
        break;
      case 'yangi_boshlangan':
        q = q
          .eq('type', 'serialized_story')
          .eq('completion_status', 'ongoing')
          .order('published_at', { ascending: false });
        break;
      case 'yaqinda_yangilangan':
        q = q.order('updated_at', { ascending: false });
        break;
      case 'tugallangan':
        q = q.eq('completion_status', 'completed');
        break;
      case '15_daqiqa':
        q = q.eq('type', 'serialized_story').gt('total_words', 0).lte('total_words', 3500);
        break;
      case 'bepul':
        q = q.eq('access_type', 'free');
        break;
      case 'muharrir_tanlovi':
        q = q.eq('is_featured', true);
        break;
      case 'yangi_mualliflar':
        q = q.order('created_at', { ascending: false });
        break;
      case 'eng_kop_muhokama':
        q = q.order('rating_count', { ascending: false }).order('view_count', { ascending: false });
        break;
      case 'top_haftalik':
        q = q
          .order('average_rating', { ascending: false })
          .order('view_count', { ascending: false });
        break;
    }
  } else if (options?.sortBy === 'price_asc') {
    q = q.order('full_work_price', { ascending: true }).order('id', { ascending: true });
  } else if (options?.sortBy === 'price_desc') {
    q = q.order('full_work_price', { ascending: false }).order('id', { ascending: true });
  } else if (options?.sortBy === 'rating') {
    q = q.order('average_rating', { ascending: false }).order('rating_count', { ascending: false });
  } else if (options?.sortBy === 'popular') {
    q = q.order('view_count', { ascending: false }).order('average_rating', { ascending: false });
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
    works: (data as unknown as Work[]) || [],
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
  const supabase = createCatalogueClient();
  const [genresRes, wgRes] = await Promise.all([
    supabase
      .from('genres')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('work_genres')
      .select('genre_id, work:works!inner(status, is_archived)')
      .eq('work.status', 'published')
      .neq('work.is_archived', true),
  ]);

  const genres = (genresRes.data as Genre[]) || [];
  const countsMap = new Map<string, number>();

  for (const wg of wgRes.data || []) {
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
export const getPublicAuthor = requestCache(async function getPublicAuthor(identifier: string) {
  const supabase = createAdminClient();

  // Try finding by user_id first, then id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  let { data: author } = isUuid
    ? await supabase
        .from('author_profiles')
        .select(
          `
      *,
      profile:profiles(id, display_name, username, avatar_url, social_links)
    `,
        )
        .or(`user_id.eq.${identifier},id.eq.${identifier}`)
        .eq('status', 'approved')
        .maybeSingle()
    : { data: null };

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
        .select(
          `
          *,
          profile:profiles(id, display_name, username, avatar_url, social_links)
        `,
        )
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .maybeSingle();

      author = authorByProfile;
    }
  }

  if (!author) return null;

  const [worksRes, followersRes, followingRes] = await Promise.all([
    supabase
      .from('works')
      .select(
        `
        *,
        work_genres(genre:genres(*))
      `,
      )
      .eq('author_id', author.user_id)
      .eq('status', 'published')
      .eq('is_translation', false)
      .order('published_at', { ascending: false }),
    supabase
      .from('author_follows')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', author.user_id),
    supabase
      .from('author_follows')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', author.user_id),
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
  const followingCount = followingRes.count || 0;

  // Calculate total public reads canonically from reading_progress across published works (excluding author self-reads)
  const workIds = works.map((w) => w.id);
  let totalReads = 0;
  if (workIds.length > 0) {
    const { count } = await supabase
      .from('reading_progress')
      .select('id', { count: 'exact', head: true })
      .in('work_id', workIds)
      .neq('user_id', author.user_id);
    totalReads = count || 0;
  }

  return {
    author,
    works,
    totalWorks: works.length,
    totalReads,
    followerCount,
    followingCount,
  };
});

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
        original_author_name,
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
          original_author_name,
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
