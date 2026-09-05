import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const supabase = createAdminClient();

    // Verify author is approved
    const { data: author } = await supabase
      .from('author_profiles')
      .select('status')
      .eq('user_id', profile.id)
      .single();

    if (!author || author.status !== 'approved') {
      return NextResponse.json(
        { success: false, error: 'Faqat tasdiqlangan mualliflar asar yaratishi mumkin' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const id = body.id ? String(body.id) : undefined;
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const coverUrl = body.coverUrl ? String(body.coverUrl).trim() : null;
    const type = body.type === 'serialized_story' ? 'serialized_story' : 'book';
    const accessType = ['free', 'paid_full_work', 'paid_by_chapter'].includes(body.accessType)
      ? body.accessType
      : 'free';
    const fullWorkPrice = Number(body.fullWorkPrice || 0);
    const completionStatus = body.completionStatus === 'completed' ? 'completed' : 'ongoing';
    const ageRating = body.ageRating ? String(body.ageRating).trim() : 'all';
    const isArchived = Boolean(body.isArchived);
    const genreIds: string[] = Array.isArray(body.genreIds) ? body.genreIds : [];

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Asar nomini kiritish majburiy' },
        { status: 400 },
      );
    }

    let slug = slugify(title);
    if (!slug) slug = `asar-${Date.now()}`;

    // If updating, verify ownership
    if (id) {
      const { data: existing } = await supabase
        .from('works')
        .select('id, author_id, status')
        .eq('id', id)
        .single();

      if (!existing || existing.author_id !== profile.id) {
        return NextResponse.json(
          { success: false, error: 'Siz faqat o‘zingizning asaringizni tahrirlashingiz mumkin' },
          { status: 403 },
        );
      }

      if (existing.status === 'published') {
        const { data: existingRev } = await supabase
          .from('work_revisions')
          .select('id')
          .eq('work_id', id)
          .eq('author_id', profile.id)
          .eq('status', 'pending_review')
          .maybeSingle();

        let revisionResult;
        if (existingRev) {
          const { data } = await supabase
            .from('work_revisions')
            .update({
              title,
              description,
              cover_url: coverUrl,
              type,
              access_type: accessType,
              full_work_price: accessType === 'paid_full_work' ? Math.max(0, Math.floor(fullWorkPrice)) : 0,
              age_rating: ageRating,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRev.id)
            .select()
            .single();
          revisionResult = data;
        } else {
          const { data } = await supabase
            .from('work_revisions')
            .insert({
              work_id: id,
              author_id: profile.id,
              title,
              description,
              cover_url: coverUrl,
              type,
              access_type: accessType,
              full_work_price: accessType === 'paid_full_work' ? Math.max(0, Math.floor(fullWorkPrice)) : 0,
              age_rating: ageRating,
              status: 'pending_review',
            })
            .select()
            .single();
          revisionResult = data;
        }

        return NextResponse.json({
          success: true,
          isRevision: true,
          message: 'Nashr qilingan asarga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderatsiyaga yuborildi',
          revision: revisionResult,
          work: { ...existing, title, description, cover_url: coverUrl, type, access_type: accessType },
        });
      }

      const { data: updatedWork, error: updateError } = await supabase
        .from('works')
        .update({
          title,
          description,
          cover_url: coverUrl,
          type,
          access_type: accessType,
          full_work_price: Math.max(0, Math.floor(fullWorkPrice)),
          completion_status: completionStatus,
          age_rating: ageRating,
          is_archived: isArchived,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
      }

      // Update genres
      if (genreIds.length > 0) {
        await supabase.from('work_genres').delete().eq('work_id', id);
        const joins = genreIds.map((gId) => ({ work_id: id, genre_id: gId }));
        await supabase.from('work_genres').insert(joins);
      }

      return NextResponse.json({ success: true, work: updatedWork });
    }

    // Creating new work
    // Ensure slug uniqueness
    const { data: slugCheck } = await supabase
      .from('works')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (slugCheck) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const { data: newWork, error: insertError } = await supabase
      .from('works')
      .insert({
        author_id: profile.id,
        title,
        slug,
        description,
        cover_url: coverUrl,
        type,
        status: 'draft',
        access_type: accessType,
        full_work_price: Math.max(0, Math.floor(fullWorkPrice)),
        completion_status: completionStatus,
        age_rating: ageRating,
        is_archived: false,
      })
      .select()
      .single();

    if (insertError || !newWork) {
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Asarni saqlashda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    // Insert genres
    if (genreIds.length > 0) {
      const joins = genreIds.map((gId) => ({ work_id: newWork.id, genre_id: gId }));
      await supabase.from('work_genres').insert(joins);
    }

    return NextResponse.json({ success: true, work: newWork });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
