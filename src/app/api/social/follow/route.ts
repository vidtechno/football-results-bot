import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'work' | 'author'
    const targetId = searchParams.get('targetId');

    if (!type || !targetId) {
      return NextResponse.json({ error: 'Noto‘g‘ri parametrlar' }, { status: 400 });
    }

    const profile = await getCurrentProfile();
    const admin = createAdminClient();

    let isFollowing = false;
    let followerCount = 0;

    if (type === 'work') {
      const [{ count }, userFollow] = await Promise.all([
        admin.from('work_follows').select('id', { count: 'exact', head: true }).eq('work_id', targetId),
        profile
          ? admin.from('work_follows').select('id').eq('work_id', targetId).eq('user_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      followerCount = count || 0;
      isFollowing = !!userFollow.data;
    } else if (type === 'author') {
      const [{ count }, userFollow] = await Promise.all([
        admin.from('author_follows').select('id', { count: 'exact', head: true }).eq('author_id', targetId),
        profile
          ? admin.from('author_follows').select('id').eq('author_id', targetId).eq('user_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      followerCount = count || 0;
      isFollowing = !!userFollow.data;
    }

    return NextResponse.json({ isFollowing, followerCount });
  } catch (err: any) {
    console.error('Follow GET error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Iltimos, avval tizimga kiring' }, { status: 401 });
    }

    const body = await req.json();
    const { type, targetId } = body;

    if (!type || !targetId || !['work', 'author'].includes(type)) {
      return NextResponse.json({ error: 'Noto‘g‘ri parametrlar' }, { status: 400 });
    }

    const admin = createAdminClient();

    if (type === 'work') {
      // Check existing
      const { data: existing } = await admin
        .from('work_follows')
        .select('id')
        .eq('work_id', targetId)
        .eq('user_id', profile.id)
        .maybeSingle();

      let isFollowing = false;
      if (existing) {
        await admin.from('work_follows').delete().eq('id', existing.id);
        isFollowing = false;
      } else {
        await admin.from('work_follows').insert({ work_id: targetId, user_id: profile.id });
        isFollowing = true;
      }

      const { count } = await admin
        .from('work_follows')
        .select('id', { count: 'exact', head: true })
        .eq('work_id', targetId);

      return NextResponse.json({
        success: true,
        isFollowing,
        followerCount: count || 0,
        message: isFollowing ? 'Asar kuzatuvga olindi' : 'Kuzatuv bekor qilindi',
      });
    } else {
      // Author follow
      const { data: existing } = await admin
        .from('author_follows')
        .select('id')
        .eq('author_id', targetId)
        .eq('user_id', profile.id)
        .maybeSingle();

      let isFollowing = false;
      if (existing) {
        await admin.from('author_follows').delete().eq('id', existing.id);
        isFollowing = false;
      } else {
        await admin.from('author_follows').insert({ author_id: targetId, user_id: profile.id });
        isFollowing = true;
      }

      const { count } = await admin
        .from('author_follows')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', targetId);

      return NextResponse.json({
        success: true,
        isFollowing,
        followerCount: count || 0,
        message: isFollowing ? 'Muallif kuzatuvga olindi' : 'Kuzatuv bekor qilindi',
      });
    }
  } catch (err: any) {
    console.error('Follow POST error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
