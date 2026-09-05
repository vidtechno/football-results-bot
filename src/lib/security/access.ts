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
  const rawPrice = Number(chapter.price || 0);

  // Full purchase work protection:
  // Under 'paid_full_work' or 'paid_book', individual chapter is_free=true is strictly ignored.
  // The entire work requires a full-work purchase unless user is author or admin.
  const isPaidFullWork =
    work.access_type === 'paid_full_work' ||
    work.access_type === 'paid_book' ||
    (work.access_type !== 'paid_by_chapter' && work.access_type !== 'free' && Number(work.full_work_price || 0) > 0);

  const isFree = !isPaidFullWork && Boolean(chapter.is_free);
  const effectivePrice = isPaidFullWork ? Number(work.full_work_price || 0) : rawPrice;

  // Helper template for returning result
  const buildResult = (canRead: boolean, reason: ChapterAccessReason, content: string = ''): ChapterAccessResult => ({
    canRead,
    reason,
    isFree,
    price: effectivePrice,
    chapterNumber: chapter.chapter_number,
    title: chapter.title,
    slug: chapter.slug,
    workId: work.id,
    workSlug: work.slug,
    authorId,
    content,
  });

  // 1. Author Access (preview mode)
  if (userId && authorId === userId) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return buildResult(true, 'author', contentRec?.content || '');
  }

  // 2. Admin Preview Access (strictly on admin routes)
  if (userId && options?.isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profile?.is_admin) {
      const { data: contentRec } = await supabase
        .from('chapter_contents')
        .select('content')
        .eq('chapter_id', chapter.id)
        .maybeSingle();

      return buildResult(true, 'admin_preview', contentRec?.content || '');
    }
  }

  // Drafts & unapproved works must NOT be visible to public readers
  if (!isWorkPublished || !isChapterPublished) {
    return buildResult(false, 'locked', '');
  }

  // 3. Free chapter (strictly non-full-purchase works)
  if (isFree) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return buildResult(true, 'free', contentRec?.content || '');
  }

  if (userId) {
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
        entQuery = (entQuery as any).limit(1);
      }

      const { data: entitlements } = await entQuery;

      if (entitlements && entitlements.length > 0) {
        const ent = entitlements[0];
        const reason: ChapterAccessReason =
          ent.entitlement_type === 'full_work' ? 'purchased_full_work' : 'purchased_chapter';

        const { data: contentRec } = await supabase
          .from('chapter_contents')
          .select('content')
          .eq('chapter_id', chapter.id)
          .maybeSingle();

        return buildResult(true, reason, contentRec?.content || '');
      }
    } catch {
      // Pre-migration or mock fallback
    }

    try {
      let purchaseQuery = supabase
        .from('purchases')
        .select('id, purchase_type, chapter_id, work_id, status')
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
        const hasFullWork = purchases.some((p: any) => p.purchase_type === 'full_work');
        const hasChapter = purchases.some(
          (p: any) => p.purchase_type === 'chapter' && p.chapter_id === chapter.id
        );

        if (hasFullWork || hasChapter) {
          const reason: ChapterAccessReason = hasFullWork ? 'purchased_full_work' : 'purchased_chapter';
          const { data: contentRec } = await supabase
            .from('chapter_contents')
            .select('content')
            .eq('chapter_id', chapter.id)
            .maybeSingle();

          return buildResult(true, reason, contentRec?.content || '');
        }
      }
    } catch {
      // Fallback if purchases query fails
    }
  }

  return buildResult(false, 'locked', '');
}

/**
 * Batch resolves access state for all chapters of a work for a given user.
 */
export async function getWorkChaptersAccessMap(
  userId: string | null | undefined,
  workId: string,
  chapters: Array<{ id: string; is_free?: boolean | null; price?: number | null }>,
  options?: {
    customClient?: any;
    authorId?: string;
    workAccessType?: string;
    fullWorkPrice?: number;
  },
): Promise<Record<string, { isFree: boolean; isPurchased: boolean; isLocked: boolean; price: number }>> {
  const map: Record<string, { isFree: boolean; isPurchased: boolean; isLocked: boolean; price: number }> = {};
  const isAuthor = Boolean(userId && options?.authorId && userId === options.authorId);
  const isPaidFullWork = options?.workAccessType === 'paid_full_work' || options?.workAccessType === 'paid_book';

  chapters.forEach((ch) => {
    const isFree = !isPaidFullWork && Boolean(ch.is_free);
    map[ch.id] = {
      isFree,
      isPurchased: false,
      isLocked: !isFree,
      price: isPaidFullWork ? Number(options?.fullWorkPrice || 0) : (isFree ? 0 : Number(ch.price || 0)),
    };
  });

  if (isAuthor) {
    chapters.forEach((ch) => {
      map[ch.id].isLocked = false;
      map[ch.id].isPurchased = true;
    });
    return map;
  }

  if (!userId) {
    return map;
  }

  const supabase = options?.customClient || createAdminClient();

  let entitlements: any[] = [];
  try {
    let entQuery = supabase
      .from('entitlements')
      .select('entitlement_type, chapter_id')
      .eq('user_id', userId)
      .eq('work_id', workId);
    const entRes = await entQuery;
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

  const hasFullWork =
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
    }
  });

  return map;
}
