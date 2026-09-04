import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workId = searchParams.get('workId');

    if (!workId) {
      return NextResponse.json({ success: false, error: 'Asar ID ko‘rsatilmadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify ownership or admin
    const { data: work } = await adminClient
      .from('works')
      .select('id, author_id')
      .eq('id', workId)
      .single();

    if (!work || (work.author_id !== profile.id && !profile.is_admin)) {
      return NextResponse.json({ success: false, error: 'Ruxsat berilmadi' }, { status: 403 });
    }

    const { data: revisions, error } = await adminClient
      .from('work_revisions')
      .select('*')
      .eq('work_id', workId)
      .order('created_at', { ascending: false });

    if (error) {
      // Pre-migration fallback
      return NextResponse.json({ success: true, revisions: [] });
    }

    return NextResponse.json({ success: true, revisions: revisions || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const body = await request.json();
    const workId = String(body.workId || '');

    if (!workId) {
      return NextResponse.json({ success: false, error: 'Asar ID talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Verify ownership
    const { data: work } = await adminClient
      .from('works')
      .select('*')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json({ success: false, error: 'Faqat o‘zingizning asaringizni tahrirlashingiz mumkin' }, { status: 403 });
    }

    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Asar nomi bo‘sh bo‘lishi mumkin emas' }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim() : null;
    const coverUrl = body.coverUrl ? String(body.coverUrl).trim() : work.cover_url;
    const type = body.type === 'serialized_story' ? 'serialized_story' : 'book';
    const accessType = body.accessType || work.access_type;
    const fullWorkPrice = Number(body.fullWorkPrice || 0);
    const ageRating = body.ageRating || work.age_rating || '0+';

    // If work is in draft state, update directly
    if (work.status === 'draft') {
      const { data: updatedWork, error: updateErr } = await adminClient
        .from('works')
        .update({
          title,
          description,
          cover_url: coverUrl,
          type,
          access_type: accessType,
          full_work_price: accessType === 'paid_full_work' ? fullWorkPrice : 0,
          age_rating: ageRating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workId)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ success: false, error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, isDraftUpdate: true, work: updatedWork });
    }

    // Work is published: Create or update pending revision
    // Check if there is already a pending revision
    const { data: existingRev } = await adminClient
      .from('work_revisions')
      .select('id')
      .eq('work_id', workId)
      .eq('author_id', profile.id)
      .eq('status', 'pending_review')
      .maybeSingle();

    let revisionResult;
    if (existingRev) {
      const { data, error } = await adminClient
        .from('work_revisions')
        .update({
          title,
          description,
          cover_url: coverUrl,
          type,
          access_type: accessType,
          full_work_price: accessType === 'paid_full_work' ? fullWorkPrice : 0,
          age_rating: ageRating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRev.id)
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      revisionResult = data;
    } else {
      const { data, error } = await adminClient
        .from('work_revisions')
        .insert({
          work_id: workId,
          author_id: profile.id,
          title,
          description,
          cover_url: coverUrl,
          type,
          access_type: accessType,
          full_work_price: accessType === 'paid_full_work' ? fullWorkPrice : 0,
          age_rating: ageRating,
          status: 'pending_review',
        })
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      revisionResult = data;
    }

    return NextResponse.json({
      success: true,
      isRevision: true,
      message: 'Nashr qilingan asarga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderatsiyaga yuborildi',
      revision: revisionResult,
    });
  } catch (err: any) {
    console.error('Work revision error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
