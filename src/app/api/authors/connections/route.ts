import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authorId = request.nextUrl.searchParams.get('authorId');
  const type = request.nextUrl.searchParams.get('type');
  if (!authorId || !['followers', 'following'].includes(type || '')) {
    return NextResponse.json({ error: 'Noto‘g‘ri parametrlar' }, { status: 400 });
  }

  const admin = createAdminClient();
  const column = type === 'followers' ? 'author_id' : 'user_id';
  const targetColumn = type === 'followers' ? 'user_id' : 'author_id';
  const { data: rows, error } = await admin
    .from('author_follows')
    .select(`${targetColumn},created_at`)
    .eq(column, authorId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = Array.from(new Set((rows || []).map((row: any) => row[targetColumn])));
  if (ids.length === 0) return NextResponse.json({ people: [] });

  const [profilesRes, authorsRes] = await Promise.all([
    admin.from('profiles').select('id,display_name,username,avatar_url').in('id', ids),
    admin.from('author_profiles').select('user_id,pen_name,status').in('user_id', ids),
  ]);
  const authorMap = new Map((authorsRes.data || []).map((row) => [row.user_id, row]));
  const people = (profilesRes.data || []).map((profile) => {
    const author = authorMap.get(profile.id);
    return {
      id: profile.id,
      displayName: author?.pen_name || profile.display_name,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      isAuthor: author?.status === 'approved',
    };
  });
  return NextResponse.json({ people });
}
