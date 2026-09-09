import { createAdminClient } from '@/lib/supabase/server';

export type ChapterAccessReason =
  | 'free'
  | 'purchased_chapter'
  | 'purchased_full_work'
  | 'author'
  | 'admin_preview'
  | 'locked';

export interface ChapterAccessResult {
  canRead: boolean;
  reason: ChapterAccessReason;
  isFree: boolean;
  price: number;
  chapterNumber: number;
  title: string;
  slug: string;
  workId: string;
  workSlug: string;
  authorId: string;
  content: string;
}

export interface ChapterAccessStatus {
  isFree: boolean;
  isPurchased: boolean;
  isLocked: boolean;
  price: number;
  accessReason?: 'free' | 'author' | 'locked' | 'purchased' | 'admin' | 'entitled';
}

export interface CanonicalAccessEvaluation {
  canRead: boolean;
  reason: ChapterAccessReason;
  isFree: boolean;
  price: number;
  isLocked: boolean;
  requiresWholeWork: boolean;
}

/**
 * Centralized Canonical Access Rule Evaluator.
 * Source of truth across public work details, reader page, purchase API, TOC and badges.
 *
 * Rules:
 * 1. If work access model is fully free ('free'):
 *    - every published chapter is free;
 *    - ignore stale chapter prices;
 *    - never show a paywall;
 *    - never create a purchase;
 *    - never debit reader, credit author, or take commission.
 *
 * 2. If work access model is whole-work purchase ('paid_full_work' or 'paid_book'):
 *    - access is controlled by the work purchase;
 *    - chapter-level prices must not create separate purchases.
 *
 * 3. If work access model is chapter-by-chapter ('paid_by_chapter'):
 *    - explicitly free chapters are free;
 *    - paid chapters require an existing chapter purchase or successful new purchase.
 *
 * 4. Author and admin preview:
 *    - can preview content without purchasing;
 *    - preview access never creates financial transactions.
 */
export function evaluateCanonicalChapterAccess({
  workAccessType,
  fullWorkPrice,
  chapterIsFree,
  chapterIsPreviewFree = false,
  chapterPrice,
  isWorkPublished = true,
  isChapterPublished = true,
  isAuthor = false,
  isAdmin = false,
  hasFullWorkEntitlement = false,
  hasChapterEntitlement = false,
}: {
  workAccessType?: string | null;
  fullWorkPrice?: number | null;
  chapterIsFree?: boolean | null;
  chapterIsPreviewFree?: boolean | null;
  chapterPrice?: number | null;
  isWorkPublished?: boolean;
  isChapterPublished?: boolean;
  isAuthor?: boolean;
  isAdmin?: boolean;
  hasFullWorkEntitlement?: boolean;
  hasChapterEntitlement?: boolean;
}): CanonicalAccessEvaluation {
  // 1. Author Access (preview mode)
  if (isAuthor) {
    return {
      canRead: true,
      reason: 'author',
      isFree: workAccessType === 'free' || Boolean(chapterIsFree),
      price: 0,
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  // 2. Admin Preview Access (strictly on admin routes or preview mode)
  if (isAdmin) {
    return {
      canRead: true,
      reason: 'admin_preview',
      isFree: workAccessType === 'free' || Boolean(chapterIsFree),
      price: 0,
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  // 3. Unpublished content protection
  if (!isWorkPublished || !isChapterPublished) {
    return {
      canRead: false,
      reason: 'locked',
      isFree: false,
      price: 0,
      isLocked: true,
      requiresWholeWork: false,
    };
  }

  // CANONICAL RULE 1: Fully free work
  if (workAccessType === 'free') {
    return {
      canRead: true,
      reason: 'free',
      isFree: true,
      price: 0,
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  if (chapterIsPreviewFree) {
    return { canRead: true, reason: 'free', isFree: true, price: 0, isLocked: false, requiresWholeWork: false };
  }

  // CANONICAL RULE 2: Whole-work purchase model
  const isPaidFullWork =
    workAccessType === 'paid_full_work' ||
    workAccessType === 'paid_book' ||
    (workAccessType !== 'paid_by_chapter' && Number(fullWorkPrice || 0) > 0);

  if (isPaidFullWork) {
    if (hasFullWorkEntitlement) {
      return {
        canRead: true,
        reason: 'purchased_full_work',
        isFree: false,
        price: Number(fullWorkPrice || 0),
        isLocked: false,
        requiresWholeWork: true,
      };
    }

    // Historical purchased chapter remains accessible even if work changed model
    if (hasChapterEntitlement) {
      return {
        canRead: true,
        reason: 'purchased_chapter',
        isFree: false,
        price: 0,
        isLocked: false,
        requiresWholeWork: false,
      };
    }

    return {
      canRead: false,
      reason: 'locked',
      isFree: false,
      price: Number(fullWorkPrice || 0),
      isLocked: true,
      requiresWholeWork: true,
    };
  }

  // CANONICAL RULE 3: Chapter-by-chapter model
  if (chapterIsFree) {
    return {
      canRead: true,
      reason: 'free',
      isFree: true,
      price: 0,
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  if (hasFullWorkEntitlement) {
    return {
      canRead: true,
      reason: 'purchased_full_work',
      isFree: false,
      price: Number(chapterPrice || 0),
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  if (hasChapterEntitlement) {
    return {
      canRead: true,
      reason: 'purchased_chapter',
      isFree: false,
      price: Number(chapterPrice || 0),
      isLocked: false,
      requiresWholeWork: false,
    };
  }

  return {
    canRead: false,
    reason: 'locked',
    isFree: false,
    price: Math.max(0, Number(chapterPrice || 0)),
    isLocked: true,
    requiresWholeWork: false,
  };
}

/**
 * Authoritative Server-Side Content Authorization Policy.
 *
 * Full chapter content may ONLY be queried and returned if:
 * 1. The chapter is free and both chapter and work are published.
 * 2. The authenticated user owns an active purchase entitlement for this chapter.
 * 3. The user owns an active whole-work entitlement for this work.
 * 4. The user is the author of the work (preview mode).
 * 5. The user is an allowlisted administrator previewing via an admin route.
 *
 * In all other cases:
 * - Full content is NEVER selected from `chapter_contents`.
 * - `content` is strictly returned as empty string `""`.
 * - Only safe public metadata (title, number, price, access status) is exposed.
 */
export async function canReadChapter(
  userId: string | null | undefined,
  chapterId: string,
  options?: {
    isAdminRoute?: boolean;
    customClient?: any;
  },
): Promise<ChapterAccessResult> {
  const supabase = options?.customClient || createAdminClient();

  const { data: chapter, error } = await supabase
    .from('chapters')
    .select(`
      id,
      work_id,
      chapter_number,
      title,
      slug,
      is_free,
      is_preview_free,
      price,
      status,
      work:works (
        id,
        slug,
        author_id,
        status,
        access_type,
        full_work_price
      )
    `)
    .eq('id', chapterId)
    .single();

  if (error || !chapter || !chapter.work) {
    return {
      canRead: false,
      reason: 'locked',
      isFree: false,
      price: 0,
      chapterNumber: 0,
      title: '',
      slug: '',
      workId: '',
      workSlug: '',
      authorId: '',
      content: '',
    };
  }

  const work = Array.isArray(chapter.work) ? chapter.work[0] : chapter.work;
  const isWorkPublished = work.status === 'published';
  const isChapterPublished = chapter.status === 'published';
  const authorId = work.author_id;

  const isAuthor = Boolean(userId && authorId === userId);
  let isAdmin = false;
  if (userId && options?.isAdminRoute) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      isAdmin = Boolean(profile?.is_admin);
    } catch {
      isAdmin = false;
    }
  }

  // 1. Author access
  if (isAuthor) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return {
      canRead: true,
      reason: 'author',
      isFree: work.access_type === 'free' || Boolean(chapter.is_free),
      price: 0,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      slug: chapter.slug,
      workId: work.id,
      workSlug: work.slug,
      authorId,
      content: contentRec?.content || '',
    };
  }

  // 2. Admin Preview Access
  if (isAdmin) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return {
      canRead: true,
      reason: 'admin_preview',
      isFree: work.access_type === 'free' || Boolean(chapter.is_free),
      price: 0,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      slug: chapter.slug,
      workId: work.id,
      workSlug: work.slug,
      authorId,
      content: contentRec?.content || '',
    };
  }

  // Unpublished content protection
  if (!isWorkPublished || !isChapterPublished) {
    return {
      canRead: false,
      reason: 'locked',
      isFree: false,
      price: 0,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      slug: chapter.slug,
      workId: work.id,
      workSlug: work.slug,
      authorId,
      content: '',
    };
  }

  // CANONICAL RULE 1: Fully free work
  if (work.access_type === 'free') {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return {
      canRead: true,
      reason: 'free',
      isFree: true,
      price: 0,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      slug: chapter.slug,
      workId: work.id,
      workSlug: work.slug,
      authorId,
      content: contentRec?.content || '',
    };
  }

  // Check entitlements & purchases if authenticated
  let hasFullWorkEntitlement = false;
  let hasChapterEntitlement = false;

  if (userId) {
    try {
      const { data: subscription } = await supabase.from('author_subscriptions').select('id')
        .eq('subscriber_id', userId).eq('author_id', authorId).eq('status', 'active')
        .gt('current_period_end', new Date().toISOString()).limit(1).maybeSingle();
      hasFullWorkEntitlement = Boolean(subscription);
    } catch { /* migration 033 may not be installed yet */ }
    try {
      let entQuery = supabase
        .from('entitlements')
        .select('id, entitlement_type, chapter_id, work_id')
        .eq('user_id', userId)
        .eq('work_id', work.id);

      if (typeof (entQuery as any).or === 'function') {
        entQuery = (entQuery as any).or(`entitlement_type.eq.full_work,chapter_id.eq.${chapter.id}`);
      }
      if (typeof (entQuery as any).limit === 'function') {
        entQuery = (entQuery as any).limit(50);
      }

      const { data: entitlements } = await entQuery;

      if (entitlements && entitlements.length > 0) {
        hasFullWorkEntitlement = entitlements.some((e: any) => e.entitlement_type === 'full_work');
        hasChapterEntitlement = entitlements.some((e: any) => e.chapter_id === chapter.id);
      }
    } catch {
      // ignore
    }

    if (!hasFullWorkEntitlement && !hasChapterEntitlement) {
      try {
        let purchaseQuery = supabase
          .from('purchases')
          .select('purchase_type, chapter_id, status')
          .eq('buyer_id', userId)
          .eq('work_id', work.id);

        if (typeof (purchaseQuery as any).in === 'function') {
          purchaseQuery = (purchaseQuery as any).in('status', ['active', 'completed', 'paid']);
        }
        if (typeof (purchaseQuery as any).limit === 'function') {
          purchaseQuery = (purchaseQuery as any).limit(50);
        }

        const { data: rawPurchases } = await purchaseQuery;
        const validStatuses = new Set(['active', 'completed', 'paid']);
        const purchases = (rawPurchases || []).filter((p: any) =>
          p.status ? validStatuses.has(p.status) : true
        );

        if (purchases && purchases.length > 0) {
          hasFullWorkEntitlement = purchases.some((p: any) => p.purchase_type === 'full_work');
          hasChapterEntitlement = purchases.some(
            (p: any) => p.purchase_type === 'chapter' && p.chapter_id === chapter.id
          );
        }
      } catch {
        // ignore
      }
    }
  }

  const evalResult = evaluateCanonicalChapterAccess({
    workAccessType: work.access_type,
    fullWorkPrice: work.full_work_price,
    chapterIsFree: chapter.is_free,
    chapterIsPreviewFree: chapter.is_preview_free,
    chapterPrice: chapter.price,
    isWorkPublished,
    isChapterPublished,
    isAuthor: false,
    isAdmin: false,
    hasFullWorkEntitlement,
    hasChapterEntitlement,
  });

  let content = '';
  if (evalResult.canRead) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    content = contentRec?.content || '';
  }

  return {
    canRead: evalResult.canRead,
    reason: evalResult.reason,
    isFree: evalResult.isFree,
    price: evalResult.price,
    chapterNumber: chapter.chapter_number,
    title: chapter.title,
    slug: chapter.slug,
    workId: work.id,
    workSlug: work.slug,
    authorId,
    content,
  };
}

export type ChapterAccessDetail = {
  isFree: boolean;
  isPurchased: boolean;
  isLocked: boolean;
  price: number;
  accessReason: 'free' | 'purchased' | 'entitled' | 'author' | 'admin' | 'locked';
};

/**
 * Batch resolves access state for all chapters of a work for a given user.
 */
export async function getWorkChaptersAccessMap(
  userId: string | null | undefined,
  workId: string,
  chapters: Array<{ id: string; is_free?: boolean | null; is_preview_free?: boolean | null; price?: number | null }>,
  options?: {
    customClient?: any;
    authorId?: string;
    workAccessType?: string;
    fullWorkPrice?: number;
    isAdmin?: boolean;
  },
): Promise<Record<string, ChapterAccessDetail>> {
  const map: Record<string, ChapterAccessDetail> = {};
  const isAuthor = Boolean(userId && options?.authorId && userId === options.authorId);
  const isFreeWork = options?.workAccessType === 'free';

  // If work is fully free, all chapters are free immediately
  if (isFreeWork) {
    chapters.forEach((ch) => {
      map[ch.id] = {
        isFree: true,
        isPurchased: false,
        isLocked: false,
        price: 0,
        accessReason: isAuthor ? 'author' : 'free',
      };
    });
    return map;
  }

  // Author preview
  if (isAuthor) {
    chapters.forEach((ch) => {
      map[ch.id] = {
        isFree: Boolean(ch.is_free),
        isPurchased: false,
        isLocked: false,
        price: 0,
        accessReason: 'author',
      };
    });
    return map;
  }

  const isPaidFullWork =
    options?.workAccessType === 'paid_full_work' ||
    options?.workAccessType === 'paid_book' ||
    (options?.workAccessType !== 'paid_by_chapter' && Number(options?.fullWorkPrice || 0) > 0);

  // Default guest evaluation
  chapters.forEach((ch) => {
    const isFree = isPaidFullWork ? Boolean(ch.is_preview_free) : Boolean(ch.is_free);
    map[ch.id] = {
      isFree,
      isPurchased: false,
      isLocked: !isFree,
      price: isPaidFullWork ? Number(options?.fullWorkPrice || 0) : (isFree ? 0 : Number(ch.price || 0)),
      accessReason: isFree ? 'free' : 'locked',
    };
  });

  if (!userId) {
    return map;
  }

  const supabase = options?.customClient || createAdminClient();

  // Check admin status
  let isAdmin = Boolean(options?.isAdmin);
  if (!isAdmin) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();
      if (profile?.is_admin) {
        isAdmin = true;
      }
    } catch {
      // ignore
    }
  }

  if (isAdmin) {
    chapters.forEach((ch) => {
      map[ch.id].isLocked = false;
      map[ch.id].isPurchased = false;
      map[ch.id].accessReason = 'admin';
    });
    return map;
  }

  let entitlements: any[] = [];
  try {
    const entRes = await supabase
      .from('entitlements')
      .select('entitlement_type, chapter_id')
      .eq('user_id', userId)
      .eq('work_id', workId);
    if (entRes?.data) {
      entitlements = entRes.data;
    }
  } catch {
    entitlements = [];
  }

  let purchases: any[] = [];
  try {
    let purQuery = supabase
      .from('purchases')
      .select('purchase_type, chapter_id, status')
      .eq('buyer_id', userId)
      .eq('work_id', workId);

    if (typeof (purQuery as any).in === 'function') {
      purQuery = (purQuery as any).in('status', ['active', 'completed', 'paid']);
    }

    const purRes = await purQuery;
    const validStatuses = new Set(['active', 'completed', 'paid']);
    const raw = purRes?.data || [];
    purchases = raw.filter((p: any) => (p.status ? validStatuses.has(p.status) : true));
  } catch {
    purchases = [];
  }

  let hasSubscription = false;
  if (options?.authorId) {
    try {
      const { data } = await supabase.from('author_subscriptions').select('id')
        .eq('subscriber_id', userId).eq('author_id', options.authorId).eq('status', 'active')
        .gt('current_period_end', new Date().toISOString()).limit(1).maybeSingle();
      hasSubscription = Boolean(data);
    } catch { /* optional until migration 033 */ }
  }
  const hasFullWork = hasSubscription ||
    entitlements.some((e: any) => e.entitlement_type === 'full_work') ||
    purchases.some((p: any) => p.purchase_type === 'full_work');

  const purchasedChapterIds = new Set<string>([
    ...entitlements.filter((e: any) => e.chapter_id).map((e: any) => e.chapter_id),
    ...purchases.filter((p: any) => p.chapter_id).map((p: any) => p.chapter_id),
  ]);

  chapters.forEach((ch) => {
    if (hasFullWork || purchasedChapterIds.has(ch.id)) {
      map[ch.id].isPurchased = true;
      map[ch.id].isLocked = false;
      map[ch.id].accessReason = 'purchased';
    }
  });

  return map;
}
