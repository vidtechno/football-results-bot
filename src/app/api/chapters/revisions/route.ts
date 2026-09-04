import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { sanitizeRichText } from '@/lib/utils/sanitizer';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'Bob ID ko‘rsatilmadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: chapter } = await adminClient
      .from('chapters')
      .select('id, work:works(author_id)')
      .eq('id', chapterId)
      .single();

    const workAuthorId = (chapter?.work as any)?.author_id;
    if (!chapter || (workAuthorId !== profile.id && !profile.is_admin)) {
      return NextResponse.json({ success: false, error: 'Ruxsat berilmadi' }, { status: 403 });
    }

    const { data: revisions, error } = await adminClient
      .from('chapter_revisions')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false });

    if (error) {
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
    const chapterId = String(body.chapterId || '');

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'Bob ID talab qilinadi' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: chapter } = await adminClient
      .from('chapters')
      .select('*, work:works(author_id)')
      .eq('id', chapterId)
      .single();

    const workAuthorId = (chapter?.work as any)?.author_id;
    if (!chapter || workAuthorId !== profile.id) {
      return NextResponse.json({ success: false, error: 'Faqat o‘zingizning asaringizdagi bobni tahrirlashingiz mumkin' }, { status: 403 });
    }

    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Bob sarlavhasi bo‘sh bo‘lishi mumkin emas' }, { status: 400 });
    }

    const rawContent = String(body.content || '');
    const sanitizedContent = sanitizeRichText(rawContent);
    const isFree = Boolean(body.isFree);
    const price = Number(body.price || 0);

    // If chapter is draft, update directly
    if (chapter.status === 'draft') {
      await adminClient
        .from('chapters')
        .update({
          title,
          is_free: isFree,
          price: isFree ? 0 : price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapterId);

      await adminClient
        .from('chapter_contents')
        .upsert({
          chapter_id: chapterId,
          content: sanitizedContent,
          updated_at: new Date().toISOString(),
        });

      return NextResponse.json({ success: true, isDraftUpdate: true });
    }

    // Chapter is published: Create or update pending revision
    const { data: existingRev } = await adminClient
      .from('chapter_revisions')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('author_id', profile.id)
      .eq('status', 'pending_review')
      .maybeSingle();

    let revisionResult;
    if (existingRev) {
      const { data, error } = await adminClient
        .from('chapter_revisions')
        .update({
          title,
          content: sanitizedContent,
          is_free: isFree,
          price: isFree ? 0 : price,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRev.id)
        .select()
        .single();

      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      revisionResult = data;
    } else {
      const { data, error } = await adminClient
        .from('chapter_revisions')
        .insert({
          chapter_id: chapterId,
          work_id: chapter.work_id,
          author_id: profile.id,
          title,
          content: sanitizedContent,
          is_free: isFree,
          price: isFree ? 0 : price,
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
      message: 'Nashr qilingan bobga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderatsiyaga yuborildi',
      revision: revisionResult,
    });
  } catch (err: any) {
    console.error('Chapter revision error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
