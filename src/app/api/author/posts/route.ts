import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const APPROVED_AUTHOR_ERROR = 'Faqat tasdiqlangan mualliflar yangilik e’lon qila oladi';

async function isApprovedAuthor(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('author_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .limit(1);

  return !error && Boolean(data?.[0]);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get('author_id');
    const username = searchParams.get('username');

    if (!authorId && !username) {
      return NextResponse.json(
        { error: 'author_id yoki username talab qilinadi' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    let targetAuthorUserId = authorId;

    if (!targetAuthorUserId && username) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (!profile) return NextResponse.json({ posts: [] });

      const { data: approvedAuthor } = await admin
        .from('author_profiles')
        .select('user_id')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .limit(1);

      targetAuthorUserId = approvedAuthor?.[0]?.user_id || null;
      if (!targetAuthorUserId) return NextResponse.json({ posts: [] });
    }

    const { data: posts, error } = await admin
      .from('author_posts')
      .select('id, author_id, content, pinned, created_at, updated_at')
      .eq('author_id', targetAuthorUserId!)
      .eq('is_published', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ posts: posts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, pinned } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Post matni bo‘sh bo‘lishi mumkin emas' }, { status: 400 });
    }

    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o‘tilmagan' }, { status: 401 });
    }

    if (!(await isApprovedAuthor(profile.id))) {
      return NextResponse.json({ error: APPROVED_AUTHOR_ERROR }, { status: 403 });
    }

    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data: newPost, error: insertError } = await admin
      .from('author_posts')
      .insert({
        // author_posts.author_id references author_profiles.user_id, not author_profiles.id.
        author_id: profile.id,
        content: content.trim(),
        pinned: Boolean(pinned),
        is_published: true,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o‘tilmagan' }, { status: 401 });
    }

    const body = await req.json();
    const postId = body.id || body.postId;
    const { content, pinned } = body;

    if (!postId) {
      return NextResponse.json({ error: 'Post identifikatori talab etiladi' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: post, error: postError } = await admin
      .from('author_posts')
      .select('id, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 });
    }

    if (post.author_id !== profile.id && !profile.is_admin) {
      return NextResponse.json({ error: 'Ruxsat berilmadi' }, { status: 403 });
    }
    if (post.author_id === profile.id && !(await isApprovedAuthor(profile.id))) {
      return NextResponse.json({ error: APPROVED_AUTHOR_ERROR }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof content === 'string' && content.trim()) updatePayload.content = content.trim();
    if (typeof pinned === 'boolean') updatePayload.pinned = pinned;

    const { data: updatedPost, error: updateError } = await admin
      .from('author_posts')
      .update(updatePayload)
      .eq('id', postId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, post: updatedPost });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const postId = new URL(req.url).searchParams.get('id');
    if (!postId) return NextResponse.json({ error: 'id ko‘rsatilmadi' }, { status: 400 });

    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ error: 'Avtorizatsiyadan o‘tilmagan' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: post, error: postError } = await admin
      .from('author_posts')
      .select('id, author_id')
      .eq('id', postId)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post topilmadi' }, { status: 404 });
    }

    if (post.author_id !== profile.id && !profile.is_admin) {
      return NextResponse.json({ error: 'Ruxsat berilmadi' }, { status: 403 });
    }
    if (post.author_id === profile.id && !(await isApprovedAuthor(profile.id))) {
      return NextResponse.json({ error: APPROVED_AUTHOR_ERROR }, { status: 403 });
    }

    const { error: deleteError } = await admin.from('author_posts').delete().eq('id', postId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Post o‘chirildi' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}
