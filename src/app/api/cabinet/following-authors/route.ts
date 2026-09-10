import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });

  const admin = createAdminClient();
  const { data: follows, error } = await admin
    .from('author_follows')
    .select('author_id,created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (follows || []).map((row) => row.author_id);
  if (ids.length === 0) return NextResponse.json({ authors: [] });

  const [profilesRes, authorsRes, worksRes] = await Promise.all([
    admin.from('profiles').select('id,display_name,username,avatar_url').in('id', ids),
    admin
      .from('author_profiles')
      .select('user_id,pen_name,status')
      .in('user_id', ids)
      .eq('status', 'approved'),
    admin
      .from('works')
      .select('id,author_id,title,slug,published_at')
      .in('author_id', ids)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
  ]);

  const profileMap = new Map((profilesRes.data || []).map((row) => [row.id, row]));
  const authorMap = new Map((authorsRes.data || []).map((row) => [row.user_id, row]));
  const latestWorkMap = new Map<string, any>();
  for (const work of worksRes.data || []) {
    if (!latestWorkMap.has(work.author_id)) latestWorkMap.set(work.author_id, work);
  }

  const authors = ids.flatMap((id) => {
    const author = authorMap.get(id);
    const publicProfile = profileMap.get(id);
    if (!author || !publicProfile) return [];
    return [
      {
        id,
        penName: author.pen_name,
        displayName: publicProfile.display_name,
        username: publicProfile.username,
        avatarUrl: publicProfile.avatar_url,
        latestWork: latestWorkMap.get(id) || null,
      },
    ];
  });

  return NextResponse.json({ authors });
}
