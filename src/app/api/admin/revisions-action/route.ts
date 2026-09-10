import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyApprovedChapterPreview } from '@/lib/services/chapterApproval';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const admin = await verifyAdminProfile(authHeader);

    if (!admin) {
      const profile = await getCurrentProfile(authHeader);
      if (!profile || !profile.is_admin) {
        return NextResponse.json(
          { success: false, error: 'Faqat administratorlar ko‘rishi mumkin' },
          { status: 403 },
        );
      }
    }

    const adminClient = createAdminClient();

    // 1. Fetch pending work revisions
    const { data: rawWorkRevs, error: workErr } = await adminClient
      .from('work_revisions')
      .select('*')
      .or('status.eq.pending_review,status.eq.pending,status.is.null')
      .order('created_at', { ascending: false });

    if (workErr) {
      console.error('Error fetching work revisions:', workErr);
    }

    const workRevisions: any[] = [];
    if (rawWorkRevs && rawWorkRevs.length > 0) {
      const workIds = Array.from(new Set(rawWorkRevs.map((r) => r.work_id)));
      const authorIds = Array.from(new Set(rawWorkRevs.map((r) => r.author_id)));

      const [worksRes, authorsRes] = await Promise.all([
        adminClient
          .from('works')
          .select(
            'id, title, description, cover_url, type, access_type, full_work_price, age_rating, status, completion_status',
          )
          .in('id', workIds),
        adminClient.from('profiles').select('id, full_name, email, avatar_url').in('id', authorIds),
      ]);

      const worksMap = new Map((worksRes.data || []).map((w) => [w.id, w]));
      const authorsMap = new Map((authorsRes.data || []).map((a) => [a.id, a]));

      for (const rev of rawWorkRevs) {
        const liveWork = worksMap.get(rev.work_id) || null;
        const author = authorsMap.get(rev.author_id) || null;
        workRevisions.push({
          ...rev,
          itemType: 'work',
          liveWork,
          author,
        });
      }
    }

    // 2. Fetch pending chapter revisions
    const { data: rawChapRevs, error: chapErr } = await adminClient
      .from('chapter_revisions')
      .select('*')
      .or('status.eq.pending_review,status.eq.pending,status.is.null')
      .order('created_at', { ascending: false });

    if (chapErr) {
      console.error('Error fetching chapter revisions:', chapErr);
    }

    const chapterRevisions: any[] = [];
    if (rawChapRevs && rawChapRevs.length > 0) {
      const chapIds = Array.from(new Set(rawChapRevs.map((r) => r.chapter_id)));
      const workIds = Array.from(new Set(rawChapRevs.map((r) => r.work_id)));
      const authorIds = Array.from(new Set(rawChapRevs.map((r) => r.author_id)));

      const [chapsRes, contentsRes, worksRes, authorsRes] = await Promise.all([
        adminClient
          .from('chapters')
          .select('id, work_id, chapter_number, title, is_free, is_preview_free, price, status')
          .in('id', chapIds),
        adminClient
          .from('chapter_contents')
          .select('chapter_id, content')
          .in('chapter_id', chapIds),
        adminClient.from('works').select('id, title, access_type').in('id', workIds),
        adminClient.from('profiles').select('id, full_name, email, avatar_url').in('id', authorIds),
      ]);

      const chapsMap = new Map((chapsRes.data || []).map((c) => [c.id, c]));
      const contentsMap = new Map((contentsRes.data || []).map((c) => [c.chapter_id, c.content]));
      const worksMap = new Map((worksRes.data || []).map((w) => [w.id, w]));
      const authorsMap = new Map((authorsRes.data || []).map((a) => [a.id, a]));

      for (const rev of rawChapRevs) {
        const liveChap = chapsMap.get(rev.chapter_id) || null;
        const liveContent = contentsMap.get(rev.chapter_id) || '';
        const work = worksMap.get(rev.work_id) || null;
        const author = authorsMap.get(rev.author_id) || null;

        chapterRevisions.push({
          ...rev,
          itemType: 'chapter',
          liveChapter: liveChap ? { ...liveChap, content: liveContent } : null,
          work,
          author,
        });
      }
    }

    return NextResponse.json({
      success: true,
      workRevisions,
      chapterRevisions,
      counts: {
        total: workRevisions.length + chapterRevisions.length,
        works: workRevisions.length,
        chapters: chapterRevisions.length,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/admin/revisions-action:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const profile = await getCurrentProfile(authHeader);
    if (!profile || !profile.is_admin) {
      const admin = await verifyAdminProfile(authHeader);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
          { status: 403 },
        );
      }
    }

    const moderatorId = profile?.id || null;

    const body = await request.json();
    const { revisionId, action, rejectionReason } = body;
    let type = body.type || body.itemType;

    if (!revisionId || !type || !action) {
      return NextResponse.json(
        { success: false, error: 'Barcha parametrlar to‘liq berilishi shart' },
        { status: 400 },
      );
    }

    // Normalize type
    if (type === 'work') type = 'work_revision';
    if (type === 'chapter') type = 'chapter_revision';

    if (!['work_revision', 'chapter_revision'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Noto‘g‘ri tahrir turi' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Noto‘g‘ri amal' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    if (action === 'approve') {
      if (type === 'work_revision') {
        // Fetch current live work before approval to detect status transitions
        const { data: revBefore } = await adminClient
          .from('work_revisions')
          .select('*')
          .eq('id', revisionId)
          .maybeSingle();

        if (!revBefore) {
          return NextResponse.json({ success: false, error: 'Tahrir topilmadi' }, { status: 404 });
        }

        const { data: liveBefore } = await adminClient
          .from('works')
          .select('id, slug, completion_status, is_translation')
          .eq('id', revBefore.work_id)
          .maybeSingle();

        // Try atomic RPC
        const { data: rpcData, error: rpcErr } = await adminClient.rpc('approve_work_revision', {
          p_revision_id: revisionId,
        });

        let targetWorkId = revBefore.work_id;
        let workSlug = liveBefore?.slug;
        let isTranslation = liveBefore?.is_translation;
        let transitionOccurred = false;

        if (rpcErr) {
          // Direct fallback if RPC is not available or fails
          const updateData: Record<string, any> = {
            title: revBefore.title,
            description: revBefore.description,
            cover_url: revBefore.cover_url,
            type: revBefore.type,
            access_type: revBefore.access_type,
            full_work_price: revBefore.full_work_price,
            age_rating: revBefore.age_rating,
            updated_at: new Date().toISOString(),
          };

          if (revBefore.completion_status) {
            updateData.completion_status = revBefore.completion_status;
          }

          await adminClient.from('works').update(updateData).eq('id', revBefore.work_id);

          // Apply proposed genres if present
          if (
            revBefore.genre_ids &&
            Array.isArray(revBefore.genre_ids) &&
            revBefore.genre_ids.length > 0
          ) {
            await adminClient.from('work_genres').delete().eq('work_id', revBefore.work_id);
            const joins = revBefore.genre_ids.map((gId: string) => ({
              work_id: revBefore.work_id,
              genre_id: gId,
            }));
            await adminClient.from('work_genres').insert(joins);
          }

          await adminClient
            .from('work_revisions')
            .update({
              status: 'approved',
              moderator_id: moderatorId,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', revisionId);

          const wasOngoing = liveBefore?.completion_status === 'ongoing';
          const isNowCompleted =
            (revBefore.completion_status || liveBefore?.completion_status) === 'completed';
          transitionOccurred = wasOngoing && isNowCompleted;
        } else {
          targetWorkId = rpcData?.work_id || targetWorkId;
          workSlug = rpcData?.slug || workSlug;
          const prevStatus =
            rpcData?.prev_completion_status || liveBefore?.completion_status || 'ongoing';
          const newStatus =
            rpcData?.new_completion_status || revBefore.completion_status || 'ongoing';
          transitionOccurred = prevStatus === 'ongoing' && newStatus === 'completed';
        }

        // Send work completion notifications exactly once when transitioning ongoing -> completed
        if (transitionOccurred) {
          try {
            const { dispatchWorkCompletionNotifications } =
              await import('@/lib/notifications/inSite');
            await dispatchWorkCompletionNotifications(targetWorkId);
          } catch (notifErr) {
            console.error('Error dispatching completion notifications:', notifErr);
          }
        }

        // Revalidate exact affected public paths
        try {
          revalidatePath('/diyoration/tahrirlar');
          revalidatePath('/diyoration/dashboard');
          revalidatePath('/asarlar');
          if (workSlug) {
            revalidatePath(`/asarlar/${workSlug}`);
          }
          if (isTranslation) {
            revalidatePath('/tarjima-asarlar');
          }
          revalidatePath(`/muallif/asar/${targetWorkId}`);
        } catch {
          // ignore
        }

        // Notify author of work revision approval
        try {
          if (revBefore.author_id) {
            const { createInSiteNotification } = await import('@/lib/notifications/inSite');
            await createInSiteNotification({
              userId: revBefore.author_id,
              type: 'revision_approved',
              title: 'Asar tahriri tasdiqlandi',
              body: `«${revBefore.title || 'Asar'}» asariga kiritgan tahriringiz tasdiqlandi va jonli nashr yangilandi.`,
              linkUrl: `/muallif/asar/${targetWorkId}`,
              data: { revisionId, workId: targetWorkId },
            });
          }
        } catch {
          // ignore
        }

        return NextResponse.json({
          success: true,
          message: 'Asar tahriri tasdiqlandi va jonli nashr yangilandi',
          data: rpcData || { work_id: targetWorkId, revision_id: revisionId },
        });
      } else {
        // Chapter revision
        const { data: revBefore } = await adminClient
          .from('chapter_revisions')
          .select('*')
          .eq('id', revisionId)
          .maybeSingle();

        if (!revBefore) {
          return NextResponse.json(
            { success: false, error: 'Bob tahriri topilmadi' },
            { status: 404 },
          );
        }

        const { data: liveChap } = await adminClient
          .from('chapters')
          .select('id, slug, work_id, work:works(slug, is_translation)')
          .eq('id', revBefore.chapter_id)
          .maybeSingle();

        const workSlug = (liveChap?.work as any)?.slug;
        const chapterSlug = liveChap?.slug;
        const isTranslation = (liveChap?.work as any)?.is_translation;

        const { data: rpcData, error: rpcErr } = await adminClient.rpc('approve_chapter_revision', {
          p_revision_id: revisionId,
        });

        if (rpcErr) {
          // Never bypass an RPC rejection with unchecked, non-atomic writes.
          throw new Error('Bob tahririni tasdiqlab bo‘lmadi: ' + rpcErr.message);
        }

        // Older databases can return success without copying is_preview_free.
        // Verify the persisted approval and reconcile only that exact version.
        await verifyApprovedChapterPreview(adminClient, revisionId);
        revalidateTag('public-catalogue');

        // Revalidate exact affected public paths
        try {
          revalidatePath('/diyoration/tahrirlar');
          revalidatePath('/diyoration/dashboard');
          revalidatePath('/asarlar');
          if (workSlug) {
            revalidatePath(`/asarlar/${workSlug}`);
            if (chapterSlug) {
              revalidatePath(`/asarlar/${workSlug}/${chapterSlug}`);
            }
          }
          if (isTranslation) {
            revalidatePath('/tarjima-asarlar');
          }
          if (revBefore.work_id) {
            revalidatePath(`/muallif/asar/${revBefore.work_id}`);
          }
        } catch {
          // ignore
        }

        // Notify author of approval
        try {
          if (revBefore.author_id) {
            const { createInSiteNotification } = await import('@/lib/notifications/inSite');
            await createInSiteNotification({
              userId: revBefore.author_id,
              type: 'revision_approved',
              title: 'Bob tahriri tasdiqlandi',
              body: `«${revBefore.title || 'Bob'}» bobiga kiritgan tahriringiz tasdiqlandi va jonli nashr yangilandi.`,
              linkUrl: `/muallif/asar/${revBefore.work_id}`,
              data: { revisionId, workId: revBefore.work_id },
            });
          }
        } catch {
          // ignore
        }

        return NextResponse.json({
          success: true,
          message: 'Bob tahriri tasdiqlandi va jonli nashr yangilandi',
          data: rpcData || { revision_id: revisionId },
        });
      }
    } else {
      // Rejection action - Requires a mandatory reason
      const cleanReason = String(rejectionReason || '').trim();
      if (!cleanReason) {
        return NextResponse.json(
          { success: false, error: 'Tahrirni rad etish sababini kiritish majburiy' },
          { status: 400 },
        );
      }

      const tableName = type === 'work_revision' ? 'work_revisions' : 'chapter_revisions';

      // Fetch author info before update for notification
      const { data: revToReject } = await adminClient
        .from(tableName)
        .select('author_id, work_id, title')
        .eq('id', revisionId)
        .maybeSingle();

      const { error } = await adminClient
        .from(tableName)
        .update({
          status: 'rejected',
          rejection_reason: cleanReason,
          moderator_id: moderatorId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', revisionId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      // Notify author of rejection
      if (revToReject?.author_id) {
        try {
          const { createInSiteNotification } = await import('@/lib/notifications/inSite');
          await createInSiteNotification({
            userId: revToReject.author_id,
            type: 'revision_rejected',
            title: 'Tahriringiz rad etildi',
            body: `«${revToReject.title || 'Tahrir'}» rad etildi. Sabab: ${cleanReason}`,
            linkUrl: `/muallif/asar/${revToReject.work_id}`,
            data: { revisionId, cleanReason },
          });
        } catch {
          // ignore
        }
      }

      try {
        revalidatePath('/diyoration/tahrirlar');
        revalidatePath('/diyoration/dashboard');
      } catch {
        // ignore
      }

      return NextResponse.json({
        success: true,
        message: 'Tahrir rad etildi. Jonli nashr o‘zgarishsiz saqlab qolindi.',
      });
    }
  } catch (err: any) {
    console.error('Revisions action error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
