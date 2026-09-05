import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
        adminClient.from('works').select('id, title, description, cover_url, type, access_type, full_work_price, age_rating, status, completion_status').in('id', workIds),
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
        adminClient.from('chapters').select('id, work_id, chapter_number, title, is_free, price, status').in('id', chapIds),
        adminClient.from('chapter_contents').select('chapter_id, content').in('chapter_id', chapIds),
        adminClient.from('works').select('id, title').in('id', workIds),
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
    let type = body.type;

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
        // Try atomic RPC
        const { data: rpcData, error: rpcErr } = await adminClient.rpc('approve_work_revision', {
          p_revision_id: revisionId,
        });

        if (rpcErr) {
          // Direct fallback if RPC is not available or fails
          const { data: rev } = await adminClient
            .from('work_revisions')
            .select('*')
            .eq('id', revisionId)
            .single();

          if (!rev) return NextResponse.json({ success: false, error: 'Tahrir topilmadi' }, { status: 404 });

          await adminClient
            .from('works')
            .update({
              title: rev.title,
              description: rev.description,
              cover_url: rev.cover_url,
              type: rev.type,
              access_type: rev.access_type,
              full_work_price: rev.full_work_price,
              age_rating: rev.age_rating,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rev.work_id);

          await adminClient
            .from('work_revisions')
            .update({
              status: 'approved',
              moderator_id: moderatorId,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', revisionId);

          try {
            revalidatePath('/diyoration/tahrirlar');
            revalidatePath('/diyoration/dashboard');
            revalidatePath('/asarlar');
            revalidatePath(`/muallif/asar/${rev.work_id}`);
          } catch {
            // ignore
          }

          return NextResponse.json({ success: true, message: 'Asar tahriri tasdiqlandi va jonli nashr yangilandi' });
        }

        try {
          revalidatePath('/diyoration/tahrirlar');
          revalidatePath('/diyoration/dashboard');
          revalidatePath('/asarlar');
        } catch {
          // ignore
        }

        // Notify author of work revision approval
        try {
          const { data: revData } = await adminClient.from('work_revisions').select('author_id, work_id, title').eq('id', revisionId).maybeSingle();
          if (revData?.author_id) {
            const { createInSiteNotification } = await import('@/lib/notifications/inSite');
            await createInSiteNotification({
              userId: revData.author_id,
              type: 'revision_approved',
              title: 'Asar tahriri tasdiqlandi',
              body: `«${revData.title || 'Asar'}» asariga kiritgan tahriringiz tasdiqlandi va jonli nashr yangilandi.`,
              linkUrl: `/muallif/asar/${revData.work_id}`,
              data: { revisionId, workId: revData.work_id },
            });
          }
        } catch {
          // ignore
        }

        return NextResponse.json({ success: true, message: 'Asar tahriri tasdiqlandi va yangilandi', data: rpcData });
      } else {
        // Chapter revision
        const { data: rpcData, error: rpcErr } = await adminClient.rpc('approve_chapter_revision', {
          p_revision_id: revisionId,
        });

        if (rpcErr) {
          // Direct fallback
          const { data: rev } = await adminClient
            .from('chapter_revisions')
            .select('*')
            .eq('id', revisionId)
            .single();

          if (!rev) return NextResponse.json({ success: false, error: 'Bob tahriri topilmadi' }, { status: 404 });

          await adminClient
            .from('chapters')
            .update({
              title: rev.title,
              is_free: rev.is_free,
              price: rev.price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rev.chapter_id);

          await adminClient
            .from('chapter_contents')
            .upsert({
              chapter_id: rev.chapter_id,
              content: rev.content,
              updated_at: new Date().toISOString(),
            });

          await adminClient
            .from('chapter_revisions')
            .update({
              status: 'approved',
              moderator_id: moderatorId,
              reviewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', revisionId);

          try {
            revalidatePath('/diyoration/tahrirlar');
            revalidatePath('/diyoration/dashboard');
            revalidatePath('/asarlar');
            revalidatePath(`/muallif/asar/${rev.work_id}`);
          } catch {
            // ignore
          }

          return NextResponse.json({ success: true, message: 'Bob tahriri tasdiqlandi va jonli nashr yangilandi' });
        }

        try {
          revalidatePath('/diyoration/tahrirlar');
          revalidatePath('/diyoration/dashboard');
          revalidatePath('/asarlar');
        } catch {
          // ignore
        }

        // Notify author of approval
        try {
          const { data: revData } = await adminClient.from('chapter_revisions').select('author_id, work_id, title').eq('id', revisionId).maybeSingle();
          if (revData?.author_id) {
            const { createInSiteNotification } = await import('@/lib/notifications/inSite');
            await createInSiteNotification({
              userId: revData.author_id,
              type: 'revision_approved',
              title: 'Bob tahriri tasdiqlandi',
              body: `«${revData.title || 'Bob'}» bobiga kiritgan tahriringiz tasdiqlandi va jonli nashr yangilandi.`,
              linkUrl: `/muallif/asar/${revData.work_id}`,
              data: { revisionId, workId: revData.work_id },
            });
          }
        } catch {
          // ignore
        }

        return NextResponse.json({ success: true, message: 'Bob tahriri tasdiqlandi va jonli nashr yangilandi', data: rpcData });
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
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
