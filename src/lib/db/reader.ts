import { createAdminClient } from '@/lib/supabase/server';
import { evaluateCanonicalChapterAccess, type ChapterAccessReason, type ChapterAccessStatus } from '@/lib/security/access';
import { hasActivePlus } from '@/lib/plus/access';
import type { Work, Chapter } from '@/lib/types/platform';
import { requestCache } from './shared';

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
  chapter:
    | (Pick<Chapter, 'title' | 'chapter_number' | 'slug' | 'is_free' | 'is_preview_free'> & {
        isFirstPublished: boolean;
      })
    | null;
}> {
  const { work, chapters } = await getReaderWorkAndChapters(workSlug);
  if (!work || work.status !== 'published') return { work: null, chapter: null };
  const chapterIndex = chapters.findIndex((item: Chapter) => item.slug === chapterSlug);
  if (chapterIndex < 0) return { work, chapter: null };
  return {
    work,
    chapter: {
      title: chapters[chapterIndex].title,
      chapter_number: chapters[chapterIndex].chapter_number,
      slug: chapters[chapterIndex].slug,
      is_free: chapters[chapterIndex].is_free,
      is_preview_free: chapters[chapterIndex].is_preview_free,
      isFirstPublished: chapterIndex === 0,
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
  let activePlus = false;

  if (userId) {
    isAuthor = work.author_id === userId;
    const needsPaidAccessState = work.access_type !== 'free' || Boolean(work.is_plus);

    // Parallel fetch of authenticated reader state. The already-resolved profile
    // supplies admin state, so this path does not query profiles a second time.
    // Fully free, non-Plus works never need entitlement or purchase reads.
    const [entRes, progRes, plusAccess] = await Promise.all([
      needsPaidAccessState
        ? supabase
            .from('entitlements')
            .select('entitlement_type, chapter_id')
            .eq('user_id', userId)
            .eq('work_id', work.id)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('reading_progress')
        .select('page_index, percentage, chapter_id, last_read_at')
        .eq('user_id', userId)
        .eq('work_id', work.id)
        .maybeSingle(),
      work.is_plus ? hasActivePlus(userId, supabase) : Promise.resolve(false),
    ]);
    activePlus = plusAccess;

    isAdmin = Boolean(options?.isAdmin);

    const entitlements = entRes.data || [];
    // Entitlements are canonical after migration 032. Query legacy purchases only
    // when no entitlement exists, preserving old accounts without taxing every read.
    let rawPurchases: any[] = [];
    if (needsPaidAccessState && entitlements.length === 0) {
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
    workIsPlus: Boolean(work.is_plus),
    chapterNumber: Number(currentChapter.chapter_number),
    hasPlusSubscription: activePlus,
  });

  // Balance is only rendered in the paywall. Avoid one database read on every
  // successfully authorized chapter request (free, purchased, Plus, author/admin).
  if (userId && !accessEval.canRead) {
    const { data: wallet } = await supabase
      .from('wallet_accounts')
      .select('balance')
      .eq('user_id', userId)
      .eq('account_type', 'reader_credit')
      .maybeSingle();
    userBalance = Number(wallet?.balance || 0);
  }

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
      workIsPlus: Boolean(work.is_plus),
      chapterNumber: Number(ch.chapter_number),
      hasPlusSubscription: activePlus,
    });

    let accessReason: ChapterAccessStatus['accessReason'] = 'locked';
    if (chEval.reason === 'free') accessReason = 'free';
    else if (chEval.reason === 'author') accessReason = 'author';
    else if (chEval.reason === 'admin_preview') accessReason = 'admin';
    else if (chEval.reason === 'purchased_chapter' || chEval.reason === 'purchased_full_work')
      accessReason = 'purchased';
    else if (chEval.reason === 'plus') accessReason = 'plus';

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
