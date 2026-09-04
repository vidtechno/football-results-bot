import { createServerClient, createAdminClient } from '@/lib/supabase/server';
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
    .order('published_at', { ascending: false });

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

  const { data, error } = await q;

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
export async function getWorkBySlug(slug: string): Promise<{
  work: Work | null;
  chapters: Chapter[];
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
    return { work: null, chapters: [] };
  }

  const { data: chaptersData } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, is_free, price, status, published_at, created_at, updated_at')
    .eq('work_id', workData.id)
    .eq('status', 'published')
    .order('chapter_number', { ascending: true });

  const work: Work = {
    ...workData,
    genres: (workData.work_genres || []).map((wg: any) => wg.genre).filter(Boolean),
    chapters_count: (chaptersData || []).length,
  };

  return {
    work,
    chapters: (chaptersData as Chapter[]) || [],
  };
}

/**
 * Fetch chapter reading content with access validation.
 * If chapter is locked and user has not unlocked it, content is null.
 */
export async function getChapterForReading(
  workSlug: string,
  chapterSlug: string,
  userId?: string | null,
): Promise<{
  work: Work | null;
  chapter: Chapter | null;
  hasAccess: boolean;
  userBalance?: number;
  allChapters: Chapter[];
}> {
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
    return { work: null, chapter: null, hasAccess: false, allChapters: [] };
  }

  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, is_free, price, status, published_at, created_at, updated_at')
    .eq('work_id', work.id)
    .eq('status', 'published')
    .order('chapter_number', { ascending: true });

  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('work_id', work.id)
    .eq('slug', chapterSlug)
    .single();

  if (!chapter) {
    return { work, chapter: null, hasAccess: false, allChapters: (allChapters as Chapter[]) || [] };
  }

  // Determine access
  let hasAccess = false;
  let userBalance = 0;

  if (chapter.is_free) {
    hasAccess = true;
  } else if (userId) {
    // Author or admin access
    if (work.author_id === userId) {
      hasAccess = true;
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (profile?.is_admin) {
        hasAccess = true;
      } else {
        // Check purchases: full_work or specific chapter
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('buyer_id', userId)
          .eq('work_id', work.id)
          .or(`purchase_type.eq.full_work,chapter_id.eq.${chapter.id}`)
          .eq('status', 'active')
          .limit(1);

        if (purchase && purchase.length > 0) {
          hasAccess = true;
        }
      }
    }

    // Get user reader balance
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('account_type', 'reader_credit')
      .single();

    if (wallet) {
      userBalance = Number(wallet.balance);
    }
  }

  // If no access, hide full content!
  const sanitizedChapter: Chapter = {
    ...chapter,
    content: hasAccess ? chapter.content : '',
  };

  return {
    work,
    chapter: sanitizedChapter,
    hasAccess,
    userBalance,
    allChapters: (allChapters as Chapter[]) || [],
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
