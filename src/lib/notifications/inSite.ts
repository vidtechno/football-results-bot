import { createAdminClient } from '@/lib/supabase/server';

export interface InSiteNotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  data?: Record<string, any>;
}

/**
 * Creates an in-site notification for a user.
 * Guaranteed never to throw or crash the calling financial transaction or caller action.
 */
export async function createInSiteNotification(payload: InSiteNotificationPayload): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('in_site_notifications').insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link_url: payload.linkUrl || null,
      data: payload.data || {},
      is_read: false,
    });

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
 * Dispatches notifications to all followers of a work (e.g. when a new chapter is published).
 */
export async function notifyWorkFollowers(
  workId: string,
  workTitle: string,
  chapterTitle: string,
  chapterUrl: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: followers } = await admin
      .from('work_follows')
      .select('user_id')
      .eq('work_id', workId);

    if (!followers || followers.length === 0) return;

    const rows = followers.map((f) => ({
      user_id: f.user_id,
      type: 'new_chapter',
      title: `Yangi bob: ${workTitle}`,
      body: `«${workTitle}» asariga yangi bob qo‘shildi: ${chapterTitle}`,
      link_url: chapterUrl,
      data: { workId },
      is_read: false,
    }));

    await admin.from('in_site_notifications').insert(rows);
  } catch (err: any) {
    console.warn('Failed to notify work followers:', err?.message);
  }
}

/**
 * Dispatches notifications to all followers of an author (e.g. when a new work is published).
 */
export async function notifyAuthorFollowers(
  authorUserId: string,
  authorPenName: string,
  workTitle: string,
  workUrl: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: followers } = await admin
      .from('author_follows')
      .select('user_id')
      .eq('author_id', authorUserId);

    if (!followers || followers.length === 0) return;

    const rows = followers.map((f) => ({
      user_id: f.user_id,
      type: 'new_work',
      title: `Yangi asar: ${authorPenName}`,
      body: `${authorPenName} yangi asar chop etdi: «${workTitle}»`,
      link_url: workUrl,
      data: { authorUserId },
      is_read: false,
    }));

    await admin.from('in_site_notifications').insert(rows);
  } catch (err: any) {
    console.warn('Failed to notify author followers:', err?.message);
  }
}
