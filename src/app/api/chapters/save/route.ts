import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';
import { sanitizeRichText } from '@/lib/utils/sanitizer';
import { dispatchNewChapterPublicationNotifications } from '@/lib/notifications/inSite';

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
    const scheduledAt = body.scheduledAt ? String(body.scheduledAt) : null;
    let status: 'draft' | 'scheduled' | 'published' = 'draft';
    if (body.status === 'published') {
      status = 'published';
    } else if (body.status === 'scheduled') {
      status = 'scheduled';
      if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: 'Rejalashtirilgan vaqt kelajakda bo‘lishi lozim' },
          { status: 400 },
        );
      }
    }

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
      .select('id, author_id, access_type')
      .eq('id', workId)
      .single();

    if (!work || work.author_id !== profile.id) {
      return NextResponse.json(
        { success: false, error: 'Siz faqat o‘zingizning asaringizga bob qo‘shishingiz mumkin' },
        { status: 403 },
      );
    }
    const chapterIsFree = work.access_type === 'free';
    const isPreviewFree = work.access_type !== 'free' && isFree;

    let slug = slugify(title);
    if (!slug) slug = `bob-${chapterNumber}`;

    if (id) {
      const { data: existingChap } = await supabase
        .from('chapters')
        .select('*, work:works(status)')
        .eq('id', id)
        .eq('work_id', workId)
        .single();

      const isPublished = existingChap?.status === 'published' || (existingChap?.work as any)?.status === 'published';

      if (isPublished) {
        const { data: existingRev } = await supabase
          .from('chapter_revisions')
          .select('id')
          .eq('chapter_id', id)
          .eq('author_id', profile.id)
          .eq('status', 'pending_review')
          .maybeSingle();

        let revisionResult;
        if (existingRev) {
          const { data } = await supabase
            .from('chapter_revisions')
            .update({
              title,
              content,
              is_free: chapterIsFree,
              is_preview_free: isPreviewFree,
              price: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRev.id)
            .select()
            .single();
          revisionResult = data;
        } else {
          const { data } = await supabase
            .from('chapter_revisions')
            .insert({
              chapter_id: id,
              work_id: workId,
              author_id: profile.id,
              title,
              content,
              is_free: chapterIsFree,
              is_preview_free: isPreviewFree,
              price: 0,
              status: 'pending_review',
            })
            .select()
            .single();
          revisionResult = data;
        }

        return NextResponse.json({
          success: true,
          isRevision: true,
          message: 'Nashr qilingan bobga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderatsiyaga yuborildi',
          revision: revisionResult,
          chapter: { ...existingChap, title, content, is_free: chapterIsFree, is_preview_free: isPreviewFree, price: 0 },
        });
      }

      // Update draft chapter metadata
      const nowIso = new Date().toISOString();
      const willPublish = status === 'published' && existingChap?.status !== 'published';

      const updateFields: any = {
        chapter_number: chapterNumber,
        title,
        is_free: chapterIsFree,
        is_preview_free: isPreviewFree,
        price: 0,
        status,
        updated_at: nowIso,
      };

      if (status === 'scheduled') {
        updateFields.scheduled_at = scheduledAt;
        updateFields.published_at = null;
      } else if (status === 'published') {
        updateFields.published_at = existingChap?.published_at || nowIso;
        updateFields.scheduled_at = null;
      } else {
        updateFields.scheduled_at = null;
      }

      const { data: updatedChapter, error: updateError } = await supabase
        .from('chapters')
        .update(updateFields)
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
          updated_at: nowIso,
        });

      // Dispatch follower notifications if transitioning to published
      if (willPublish) {
        await dispatchNewChapterPublicationNotifications(id);
      }

      // Save version snapshot only if content or title has changed
      const { data: latestVersion } = await supabase
        .from('chapter_versions')
        .select('title, content')
        .eq('chapter_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hasContentChanged = !latestVersion || latestVersion.title !== title || latestVersion.content !== content;
      if (hasContentChanged) {
        const wordCount = content ? content.trim().split(/\s+/).length : 0;
        await supabase.from('chapter_versions').insert({
          chapter_id: id,
          work_id: workId,
          author_id: profile.id,
          title,
          content,
          summary: `Tahrirlandi (${wordCount} so‘z)`,
          word_count: wordCount,
          created_at: nowIso,
        });
      }

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

    const nowIso = new Date().toISOString();
    const insertFields: any = {
      work_id: workId,
      chapter_number: chapterNumber,
      title,
      slug,
      is_free: chapterIsFree,
      is_preview_free: isPreviewFree,
      price: 0,
      status,
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (status === 'scheduled') {
      insertFields.scheduled_at = scheduledAt;
      insertFields.published_at = null;
    } else if (status === 'published') {
      insertFields.published_at = nowIso;
      insertFields.scheduled_at = null;
    }

    const { data: newChapter, error: insertError } = await supabase
      .from('chapters')
      .insert(insertFields)
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

    // If published, notify followers of the work and author
    if (status === 'published') {
      await dispatchNewChapterPublicationNotifications(newChapter.id);
    }

    // Save initial version snapshot
    const initialWords = content ? content.trim().split(/\s+/).length : 0;
    await supabase.from('chapter_versions').insert({
      chapter_id: newChapter.id,
      work_id: workId,
      author_id: profile.id,
      title,
      content,
      summary: `Dastlabki nusxa (${initialWords} so‘z)`,
      word_count: initialWords,
      created_at: nowIso,
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
