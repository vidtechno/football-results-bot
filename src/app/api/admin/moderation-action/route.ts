import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile, logAdminAction } from '@/lib/admin/auth';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const workId = String(body.workId || '');
    const action = String(body.action || ''); // 'approve' | 'reject'
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason).trim() : null;

    if (!workId) {
      return NextResponse.json(
        { success: false, error: 'Asar identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    if (action === 'approve') {
      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'publish_work', 'works', workId, {});

      // Notify author & followers
      const { createInSiteNotification, notifyAuthorFollowers } = await import('@/lib/notifications/inSite');
      const { data: work } = await supabase
        .from('works')
        .select(`
          id, title, slug, author_id,
          author:author_profiles (pen_name)
        `)
        .eq('id', workId)
        .maybeSingle();

      if (work) {
        await createInSiteNotification({
          userId: work.author_id,
          type: 'work_approved',
          title: 'Asaringiz tasdiqlandi va nashr qilindi!',
          body: `«${work.title}» asaringiz muvaffaqiyatli moderator ko‘rigidan o‘tib, ommaga e’lon qilindi.`,
          linkUrl: `/asarlar/${work.slug}`,
          data: { workId: work.id },
        });

        const authorPen = (Array.isArray(work.author) ? work.author[0]?.pen_name : (work.author as any)?.pen_name) || 'Muallif';
        await notifyAuthorFollowers(work.author_id, authorPen, work.title, `/asarlar/${work.slug}`);
      }

      return NextResponse.json({ success: true, message: 'Asar muvaffaqiyatli nashr qilindi' });
    } else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Rad etish sababi majburiy ko‘rsatilishi shart' },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'reject_work', 'works', workId, {
        reason: rejectionReason,
      });

      // Notify author
      const { createInSiteNotification } = await import('@/lib/notifications/inSite');
      const { data: work } = await supabase
        .from('works')
        .select('id, title, author_id')
        .eq('id', workId)
        .maybeSingle();

      if (work) {
        await createInSiteNotification({
          userId: work.author_id,
          type: 'work_rejected',
          title: 'Asaringiz rad etildi',
          body: `«${work.title}» asaringiz moderator tomonidan rad etildi. Sabab: ${rejectionReason}`,
          linkUrl: `/muallif/asar/${work.id}`,
          data: { workId: work.id },
        });
      }

      return NextResponse.json({ success: true, message: 'Asar rad etildi' });
    } else if (action === 'unpublish') {
      if (!rejectionReason) {
        return NextResponse.json(
          { success: false, error: 'Nashrdan olish sababi majburiy ko‘rsatilishi shart' },
          { status: 400 },
        );
      }

      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'draft',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'unpublish_work', 'works', workId, {
        reason: rejectionReason,
      });

      return NextResponse.json({ success: true, message: 'Asar nashrdan olindi va qoralamaga o‘tkazildi' });
    } else if (action === 'archive') {
      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'archive_work', 'works', workId, {});

      return NextResponse.json({ success: true, message: 'Asar arxivlandi' });
    } else if (action === 'restore') {
      const { error: updateError } = await supabase
        .from('works')
        .update({
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId);

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      await logAdminAction(supabase, admin.id, 'restore_work', 'works', workId, {});

      return NextResponse.json({ success: true, message: 'Asar arxivdan chiqarildi va nashr qilindi' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Noto‘g‘ri harakat' },
        { status: 400 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
