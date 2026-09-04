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
  const price = Number(chapter.price || 0);
  const isFree = Boolean(chapter.is_free);

  // Helper template for returning result
  const buildResult = (canRead: boolean, reason: ChapterAccessReason, content: string = ''): ChapterAccessResult => ({
    canRead,
    reason,
    isFree,
    price,
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

  // 3. Free chapter
  if (isFree) {
    const { data: contentRec } = await supabase
      .from('chapter_contents')
      .select('content')
      .eq('chapter_id', chapter.id)
      .maybeSingle();

    return buildResult(true, 'free', contentRec?.content || '');
  }

  // 4. Authenticated buyer with active purchase entitlement
  if (userId) {
    const { data: purchases } = await supabase
      .from('purchases')
      .select('id, purchase_type, chapter_id, work_id')
      .eq('buyer_id', userId)
      .eq('work_id', work.id)
      .eq('status', 'active')
      .or(`purchase_type.eq.full_work,chapter_id.eq.${chapter.id}`)
      .limit(1);

    if (purchases && purchases.length > 0) {
      const purchase = purchases[0];
      const reason: ChapterAccessReason =
        purchase.purchase_type === 'full_work' ? 'purchased_full_work' : 'purchased_chapter';

      const { data: contentRec } = await supabase
        .from('chapter_contents')
        .select('content')
        .eq('chapter_id', chapter.id)
        .maybeSingle();

      return buildResult(true, reason, contentRec?.content || '');
    }
  }

  // 5. Unauthorized / Non-buyer -> STRICTLY LOCKED
  // Do NOT select from chapter_contents!
  return buildResult(false, 'locked', '');
}

/**
 * Calculates access status map for all chapters of a work.
 * Used for Table of Contents, next-chapter buttons, and work details.
 */
export async function getWorkChaptersAccessMap(
  userId: string | null | undefined,
  workId: string,
  chapters: Array<{ id: string; is_free: boolean; price: number; status?: string }>,
  options?: {
    customClient?: any;
    authorId?: string;
  },
): Promise<Record<string, ChapterAccessStatus>> {
  const map: Record<string, ChapterAccessStatus> = {};
  const isAuthor = Boolean(userId && options?.authorId && userId === options.authorId);

  // Pre-fill defaults
  chapters.forEach((ch) => {
    map[ch.id] = {
      isFree: ch.is_free,
      isPurchased: false,
      isLocked: !ch.is_free,
      price: ch.is_free ? 0 : Number(ch.price || 0),
    };
  });

  if (isAuthor) {
    // Author has authorial access to all chapters
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

  const { data: purchases } = await supabase
    .from('purchases')
    .select('purchase_type, chapter_id')
    .eq('buyer_id', userId)
    .eq('work_id', workId)
    .eq('status', 'active');

  if (purchases && purchases.length > 0) {
    const hasFullWork = purchases.some((p: any) => p.purchase_type === 'full_work');

    chapters.forEach((ch) => {
      if (ch.is_free) {
        map[ch.id].isLocked = false;
      } else if (hasFullWork) {
        map[ch.id].isPurchased = true;
        map[ch.id].isLocked = false;
      } else {
        const isThisChapterPurchased = purchases.some(
          (p: any) => p.purchase_type === 'chapter' && p.chapter_id === ch.id,
        );
        if (isThisChapterPurchased) {
          map[ch.id].isPurchased = true;
          map[ch.id].isLocked = false;
        }
      }
    });
  }

  return map;
}
