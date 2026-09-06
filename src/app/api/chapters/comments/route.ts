import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'chapterId talab etiladi' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch chapter to know its work and author
    const { data: chapter } = await admin
      .from('chapters')
      .select('id, work_id, work:works(author_id)')
      .eq('id', chapterId)
      .single();

    const authorUserId = (chapter?.work as any)?.author_id;

    // 2. Fetch comments with user profiles
    const { data: rawComments, error } = await admin
      .from('chapter_comments')
      .select(`
        id,
        chapter_id,
        work_id,
        user_id,
        parent_id,
        content,
        is_spoiler,
        is_deleted,
        is_edited,
        edited_at,
        created_at,
        updated_at,
        user:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const comments = rawComments || [];

    // Group into 1-level hierarchy (root comments + replies)
    const rootComments: any[] = [];
    const repliesMap = new Map<string, any[]>();

    comments.forEach((c: any) => {
      const isAuthor = authorUserId && c.user_id === authorUserId;
      const formatted = {
        ...c,
        is_author: Boolean(isAuthor),
        content: c.is_deleted ? 'Ushbu izoh o‘chirildi' : c.content,
        replies: [],
      };

      if (!c.parent_id) {
        rootComments.push(formatted);
      } else {
        const existing = repliesMap.get(c.parent_id) || [];
        existing.push(formatted);
        repliesMap.set(c.parent_id, existing);
      }
    });

    rootComments.forEach((root) => {
      root.replies = repliesMap.get(root.id) || [];
    });

    // Order root comments newest first
    rootComments.reverse();

    return NextResponse.json({
      success: true,
      comments: rootComments,
      totalCount: comments.filter((c) => !c.is_deleted).length,
    });
  } catch (err: any) {
    console.error('Error fetching chapter comments:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Fikr qoldirish uchun tizimga kiring' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const chapterId = String(body.chapterId || '').trim();
    const workId = String(body.workId || '').trim();
    const parentId = body.parentId ? String(body.parentId).trim() : null;
    const content = String(body.content || '').trim();
    const isSpoiler = Boolean(body.isSpoiler);

    if (!chapterId || !content) {
      return NextResponse.json(
        { success: false, error: 'Bob va fikr matni talab etiladi' },
        { status: 400 },
      );
    }

    if (content.length < 2 || content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Fikr uzunligi 2 dan 2000 belgigacha bo‘lishi lozim' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Verify parent exists if reply
    if (parentId) {
      const { data: parentComment } = await admin
        .from('chapter_comments')
        .select('id, chapter_id')
        .eq('id', parentId)
        .single();

      if (!parentComment || parentComment.chapter_id !== chapterId) {
        return NextResponse.json(
          { success: false, error: 'Javob berilayotgan izoh topilmadi' },
          { status: 400 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    const { data: newComment, error: insertError } = await admin
      .from('chapter_comments')
      .insert({
        chapter_id: chapterId,
        work_id: workId,
        user_id: profile.id,
        parent_id: parentId,
        content,
        is_spoiler: isSpoiler,
        is_deleted: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(`
        id,
        chapter_id,
        work_id,
        user_id,
        parent_id,
        content,
        is_spoiler,
        is_deleted,
        is_edited,
        edited_at,
        created_at,
        updated_at,
        user:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (insertError || !newComment) {
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Izohni saqlashda xatolik' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...newComment,
        replies: [],
      },
    });
  } catch (err: any) {
    console.error('Error posting chapter comment:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const commentId = String(body.commentId || body.id || '').trim();
    const content = String(body.content || '').trim();
    const isSpoiler = typeof body.isSpoiler === 'boolean' ? body.isSpoiler : undefined;

    if (!commentId || !content) {
      return NextResponse.json(
        { success: false, error: 'Izoh identifikatori va yangi matn talab etiladi' },
        { status: 400 },
      );
    }

    if (content.length < 2 || content.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Fikr uzunligi 2 dan 2000 belgigacha bo‘lishi lozim' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Check comment existence and ownership
    const { data: comment, error: fetchError } = await admin
      .from('chapter_comments')
      .select('id, user_id, is_deleted, is_spoiler')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ success: false, error: 'Izoh topilmadi' }, { status: 404 });
    }

    if (comment.is_deleted) {
      return NextResponse.json(
        { success: false, error: 'O‘chirilgan izohni tahrirlab bo‘lmaydi' },
        { status: 400 },
      );
    }

    if (comment.user_id !== profile.id && !profile.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Siz faqat o‘zingiz yozgan izohni tahrirlashingiz mumkin' },
        { status: 403 },
      );
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      content,
      is_edited: true,
      edited_at: nowIso,
      updated_at: nowIso,
    };
    if (typeof isSpoiler === 'boolean') {
      updatePayload.is_spoiler = isSpoiler;
    }

    const { data: updatedComment, error: updateError } = await admin
      .from('chapter_comments')
      .update(updatePayload)
      .eq('id', commentId)
      .select(`
        id,
        chapter_id,
        work_id,
        user_id,
        parent_id,
        content,
        is_spoiler,
        is_deleted,
        is_edited,
        edited_at,
        created_at,
        updated_at,
        user:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (updateError || !updatedComment) {
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Izohni yangilashda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      comment: updatedComment,
    });
  } catch (err: any) {
    console.error('Error patching chapter comment:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ success: false, error: 'Izoh ID si ko‘rsatilmadi' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check ownership or admin
    const { data: comment } = await admin
      .from('chapter_comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ success: false, error: 'Izoh topilmadi' }, { status: 404 });
    }

    if (comment.user_id !== profile.id && !profile.is_admin) {
      return NextResponse.json({ success: false, error: 'Siz bu izohni o‘chira olmaysiz' }, { status: 403 });
    }

    // Soft delete to preserve reply hierarchy
    await admin
      .from('chapter_comments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}
