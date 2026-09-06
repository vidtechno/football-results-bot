import { createAdminClient } from '@/lib/supabase/server';

export interface InSiteNotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  sourceType?: string;
  sourceId?: string;
  data?: Record<string, any>;
}

/**
 * Creates an in-site notification for a single user.
 * Guaranteed never to throw or crash caller action.
 * Supports source-level deduplication to prevent duplicate alerts.
 */
export async function createInSiteNotification(payload: InSiteNotificationPayload): Promise<boolean> {
  try {
    const admin = createAdminClient();

    // Prevent duplicate event alerts if source information is provided
    if (payload.sourceType && payload.sourceId) {
      try {
        const { data: existing } = await admin
          .from('in_site_notifications')
          .select('id')
          .eq('user_id', payload.userId)
          .eq('source_type', payload.sourceType)
          .eq('source_id', payload.sourceId)
          .maybeSingle();

        if (existing) {
          return true; // Already processed
        }
      } catch {
        // Continue
      }
    }

    const insertData: Record<string, any> = {
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link_url: payload.linkUrl || null,
      data: payload.data || {},
      is_read: false,
      source_type: payload.sourceType || null,
      source_id: payload.sourceId || null,
    };

    const { error } = await admin.from('in_site_notifications').insert(insertData);

    if (error) {
      console.warn('Failed to insert in_site_notification:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('Exception in createInSiteNotification:', err?.message || err);
    return false;
  }
}

/**
 * Dispatches notifications to all followers of a work and its author when a chapter is published.
 * Excludes author, drafts, and prevents duplicate alerts via source deduplication.
 */
export async function dispatchNewChapterPublicationNotifications(chapterId: string): Promise<number> {
  try {
    const admin = createAdminClient();

    // 1. Fetch chapter details
    const { data: chapter, error: chapErr } = await admin
      .from('chapters')
      .select('id, work_id, chapter_number, title, slug, status')
      .eq('id', chapterId)
      .single();

    if (chapErr || !chapter || chapter.status !== 'published') {
      // Never send notifications for drafts or scheduled chapters
      return 0;
    }

    // 2. Fetch work details
    const { data: work, error: workErr } = await admin
      .from('works')
      .select(`
        id, title, slug, author_id, status,
        author:author_profiles(user_id, pen_name)
      `)
      .eq('id', chapter.work_id)
      .single();

    if (workErr || !work || work.status !== 'published') {
      return 0;
    }

    const authorUserId = work.author_id;
    const authorPenName = (work.author as any)?.pen_name || 'Muallif';

    // 3. Concurrently fetch followers of work and followers of author
    const [workFollowsRes, authorFollowsRes] = await Promise.all([
      admin.from('work_follows').select('user_id').eq('work_id', work.id),
      admin.from('author_follows').select('user_id').eq('author_id', authorUserId),
    ]);

    const recipientIds = new Set<string>();

    (workFollowsRes.data || []).forEach((f: any) => {
      if (f.user_id && f.user_id !== authorUserId) {
        recipientIds.add(f.user_id);
      }
    });

    (authorFollowsRes.data || []).forEach((f: any) => {
      if (f.user_id && f.user_id !== authorUserId) {
        recipientIds.add(f.user_id);
      }
    });

    if (recipientIds.size === 0) return 0;

    const linkUrl = `/asarlar/${work.slug}/${chapter.slug}`;
    const title = `Yangi bob: «${work.title}»`;
    const body = `${authorPenName} «${work.title}» asarining yangi ${chapter.chapter_number}-bobi («${chapter.title}»)ni nashr qildi!`;

    const recipients = Array.from(recipientIds);
    let insertedCount = 0;

    // Batch insert in chunks of 50 to prevent oversized request payloads
    const chunkSize = 50;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const rows = chunk.map((uId) => ({
        user_id: uId,
        type: 'new_chapter',
        title,
        body,
        link_url: linkUrl,
        source_type: 'chapter',
        source_id: chapter.id,
        data: { workId: work.id, chapterId: chapter.id },
        is_read: false,
      }));

      const { error: insertErr } = await admin.from('in_site_notifications').insert(rows);
      if (!insertErr) {
        insertedCount += rows.length;
      }
    }

    return insertedCount;
  } catch (err: any) {
    console.warn('Exception in dispatchNewChapterPublicationNotifications:', err?.message || err);
    return 0;
  }
}

/**
 * Dispatches notifications to all followers of an author when a new work is published.
 */
export async function notifyAuthorFollowers(
  authorUserId: string,
  authorPenName: string,
  workTitle: string,
  workUrl: string,
  workId?: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: followers } = await admin
      .from('author_follows')
      .select('user_id')
      .eq('author_id', authorUserId);

    if (!followers || followers.length === 0) return;

    const rows = followers
      .filter((f: any) => f.user_id && f.user_id !== authorUserId)
      .map((f: any) => ({
        user_id: f.user_id,
        type: 'new_work',
        title: `Yangi asar: ${authorPenName}`,
        body: `${authorPenName} yangi asar boshladi: «${workTitle}»`,
        link_url: workUrl,
        source_type: 'work',
        source_id: workId || null,
        data: { authorUserId, workId: workId || null },
        is_read: false,
      }));

    if (rows.length > 0) {
      await admin.from('in_site_notifications').insert(rows);
    }
  } catch (err: any) {
    console.warn('Failed to notify author followers:', err?.message);
  }
}
