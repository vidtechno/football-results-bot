import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';
import { sanitizeRichText } from '@/lib/utils/sanitizer';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const id = body.id ? String(body.id) : undefined;
    const workId = String(body.workId || '');
    const chapterNumber = Number(body.chapterNumber || 1);
    const title = String(body.title || '').trim();
    const rawContent = String(body.content || '').trim();
    const content = sanitizeRichText(rawContent);
    const isFree = Boolean(body.isFree);
    const price = Number(body.price || 0);
    const status = body.status === 'published' ? 'published' : 'draft';

    if (!workId || !title) {
      return NextResponse.json(
        { success: false, error: 'Asar va bob nomi talab qilinadi' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Verify ownership of the work
    const { data: work } = await supabase
      .from('works')
      .select('id, author_id')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Siz faqat o‘zingizning asaringizga bob qo‘shishingiz mumkin' },
        { status: 403 },
      );
    }

    let slug = slugify(title);
    if (!slug) slug = `bob-${chapterNumber}`;

    if (id) {
      // Update chapter metadata
      const { data: updatedChapter, error: updateError } = await supabase
        .from('chapters')
        .update({
          chapter_number: chapterNumber,
          title,
          is_free: isFree,
          price: isFree ? 0 : Math.max(0, Math.floor(price)),
          status,
          published_at: status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('work_id', workId)
        .select()
        .single();

      if (updateError || !updatedChapter) {
        return NextResponse.json(
          { success: false, error: updateError?.message || 'Bobni yangilashda xatolik' },
          { status: 500 },
        );
      }

      // Upsert chapter text into dedicated protected chapter_contents table
      await supabase
        .from('chapter_contents')
        .upsert({
          chapter_id: id,
          content,
          updated_at: new Date().toISOString(),
        });

      return NextResponse.json({
        success: true,
        chapter: { ...updatedChapter, content },
      });
    }

    // New chapter creation
    // Ensure slug uniqueness within this work
    const { data: existingSlug } = await supabase
      .from('chapters')
      .select('id')
      .eq('work_id', workId)
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const { data: newChapter, error: insertError } = await supabase
      .from('chapters')
      .insert({
        work_id: workId,
        chapter_number: chapterNumber,
        title,
        slug,
        is_free: isFree,
        price: isFree ? 0 : Math.max(0, Math.floor(price)),
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError || !newChapter) {
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Bobni yaratishda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    // Insert chapter text into protected chapter_contents table
    await supabase
      .from('chapter_contents')
      .insert({
        chapter_id: newChapter.id,
        content,
      });

    return NextResponse.json({
      success: true,
      chapter: { ...newChapter, content },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
