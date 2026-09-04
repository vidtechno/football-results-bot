import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile || !profile.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu amalni bajarishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { revisionId, type, action, rejectionReason } = body;

    if (!revisionId || !type || !action) {
      return NextResponse.json(
        { success: false, error: 'Barcha parametrlar to‘liq berilishi shart' },
        { status: 400 },
      );
    }

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
          // Fallback if migration RPC not yet applied in DB
          if (rpcErr.code === '42883') {
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
                moderator_id: profile.id,
                reviewed_at: new Date().toISOString(),
              })
              .eq('id', revisionId);

            return NextResponse.json({ success: true, message: 'Asar tahriri tasdiqlandi va yangilandi' });
          }
          return NextResponse.json({ success: false, error: rpcErr.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Asar tahriri tasdiqlandi va yangilandi', data: rpcData });
      } else {
        // Chapter revision
        const { data: rpcData, error: rpcErr } = await adminClient.rpc('approve_chapter_revision', {
          p_revision_id: revisionId,
        });

        if (rpcErr) {
          // Fallback if RPC not yet applied
          if (rpcErr.code === '42883') {
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
                moderator_id: profile.id,
                reviewed_at: new Date().toISOString(),
              })
              .eq('id', revisionId);

            return NextResponse.json({ success: true, message: 'Bob tahriri tasdiqlandi va jonli nashr yangilandi' });
          }
          return NextResponse.json({ success: false, error: rpcErr.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Bob tahriri tasdiqlandi va jonli nashr yangilandi', data: rpcData });
      }
    } else {
      // Reject revision
      const tableName = type === 'work_revision' ? 'work_revisions' : 'chapter_revisions';
      const { error } = await adminClient
        .from(tableName)
        .update({
          status: 'rejected',
          rejection_reason: String(rejectionReason || '').trim() || 'Moderator tomonidan rad etildi',
          moderator_id: profile.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', revisionId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Tahrir rad etildi. Jonli nashr o‘zgarishsiz qoldi.' });
    }
  } catch (err: any) {
    console.error('Revisions action error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
