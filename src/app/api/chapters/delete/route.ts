import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const chapterId = String(body.chapterId || '');
    if (!chapterId) {
      return NextResponse.json(
        { success: false, error: 'Bob identifikatori talab qilinadi' },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { data: chapter } = await db
      .from('chapters')
      .select('id,status,slug,work_id,work:works(author_id,slug,status)')
      .eq('id', chapterId)
      .maybeSingle();
    const work = Array.isArray(chapter?.work) ? chapter?.work[0] : chapter?.work;
    const isAdmin = profile.is_admin === true || profile.role === 'admin';
    if (!chapter || !work || (work.author_id !== profile.id && !isAdmin)) {
      return NextResponse.json({ success: false, error: 'Ruxsat berilmadi' }, { status: 403 });
    }

    if (chapter.status === 'published' || work.status === 'published') {
      const { error } = await db
        .from('chapters')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', chapterId)
        .eq('work_id', chapter.work_id);
      if (error) throw error;
    } else {
      const { error } = await db
        .from('chapters')
        .delete()
        .eq('id', chapterId)
        .eq('work_id', chapter.work_id)
        .neq('status', 'published');
      if (error) throw error;
    }

    revalidateTag('public-catalogue');
    revalidatePath(`/muallif/asar/${chapter.work_id}`);
    revalidatePath(`/asarlar/${work.slug}`);
    revalidatePath(`/asarlar/${work.slug}/${chapter.slug}`);

    return NextResponse.json({
      success: true,
      archived: chapter.status === 'published' || work.status === 'published',
      message:
        chapter.status === 'published' || work.status === 'published'
          ? 'Bob xavfsiz tarzda arxivlandi'
          : 'Qoralama bob o‘chirildi',
    });
  } catch (error) {
    console.error('Chapter delete failed:', error);
    return NextResponse.json({ success: false, error: 'Bobni o‘chirib bo‘lmadi' }, { status: 500 });
  }
}
