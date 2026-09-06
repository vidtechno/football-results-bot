import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'yangi';
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    const admin = createAdminClient();

    // 1. Yangi: Prioritize recently published or recently updated works
    if (tab === 'yangi') {
      const { data, error } = await admin
        .from('works')
        .select(`
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `)
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ success: true, tab: 'yangi', works: data || [] });
    }

    // 2. Ommabop: Rank using engagement signals over recent period
    if (tab === 'ommabop') {
      const { data, error } = await admin
        .from('works')
        .select(`
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `)
        .eq('status', 'published')
        .order('view_count', { ascending: false })
        .order('average_rating', { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ success: true, tab: 'ommabop', works: data || [] });
    }

    // 3. Siz uchun: Personalized recommendations or fallback
    if (tab === 'siz-uchun') {
      // If guest or no profile, return curated fallback collection with clear fallback flag
      if (!profile) {
        const { data: fallbackWorks } = await admin
          .from('works')
          .select(`
            *,
            author:author_profiles (
              user_id,
              pen_name,
              biography,
              status,
              profile:profiles (id, display_name, username, avatar_url)
            ),
            work_genres (genre:genres (*))
          `)
          .eq('status', 'published')
          .order('view_count', { ascending: false })
          .limit(6);

        return NextResponse.json({
          success: true,
          tab: 'siz-uchun',
          isPersonalized: false,
          fallbackReason: 'Ro‘yxatdan o‘tmagan kitobxonlar uchun ommabop asarlar to‘plami',
          works: fallbackWorks || [],
        });
      }

      // Authenticated reader: evaluate user signals
      const [allWorksRes, userGenresRes, readProgressRes, authorFollowsRes, workFollowsRes] = await Promise.all([
        admin
          .from('works')
          .select(`
            *,
            author:author_profiles (
              user_id,
              pen_name,
              biography,
              status,
              profile:profiles (id, display_name, username, avatar_url)
            ),
            work_genres (genre:genres (*))
          `)
          .eq('status', 'published')
          .limit(40),
        admin.from('user_genre_preferences').select('genre_id').eq('user_id', profile.id),
        admin.from('reading_progress').select('work_id, is_completed, percentage').eq('user_id', profile.id),
        admin.from('author_follows').select('author_id').eq('user_id', profile.id),
        admin.from('work_follows').select('work_id').eq('user_id', profile.id),
      ]);

      const allWorks = allWorksRes.data || [];
      const preferredGenreIds = new Set((userGenresRes.data || []).map((p: any) => p.genre_id));
      const followedAuthorIds = new Set((authorFollowsRes.data || []).map((f: any) => f.author_id));
      const followedWorkIds = new Set((workFollowsRes.data || []).map((w: any) => w.work_id));
      const completedWorkIds = new Set<string>();

      (readProgressRes.data || []).forEach((r: any) => {
        if (r.is_completed || (r.percentage && r.percentage >= 100)) {
          completedWorkIds.add(r.work_id);
        }
      });

      const scored = allWorks
        .filter((w: any) => !completedWorkIds.has(w.id))
        .map((w: any) => {
          let score = 0;
          let reason = 'Tavsiya etilgan asar';

          const workGenreIds = (w.work_genres || []).map((wg: any) => wg.genre?.id).filter(Boolean);
          const hasPreferredGenre = workGenreIds.some((gId: string) => preferredGenreIds.has(gId));

          if (hasPreferredGenre) {
            score += 40;
            reason = 'Sevimli janrlaringiz asosida';
          }
          if (w.author_id && followedAuthorIds.has(w.author_id)) {
            score += 35;
            reason = 'Kuzatayotgan muallifingiz asari';
          }
          if (followedWorkIds.has(w.id)) {
            score += 25;
            reason = 'Kuzatuvlaringiz asosida';
          }
          score += (w.average_rating || 0) * 5;
          score += Math.min(10, (w.view_count || 0) * 0.05);

          return { work: w, score, reason };
        })
        .sort((a, b) => b.score - a.score);

      const hasUserPreferences = preferredGenreIds.size > 0 || followedAuthorIds.size > 0 || followedWorkIds.size > 0;
      const topWorks = scored.slice(0, 8).map((s) => ({
        ...s.work,
        recommendation_reason: hasUserPreferences ? s.reason : 'Sizga manzur bo‘lishi mumkin bo‘lgan asar',
      }));

      return NextResponse.json({
        success: true,
        tab: 'siz-uchun',
        isPersonalized: hasUserPreferences,
        fallbackReason: hasUserPreferences ? null : 'Janr tanlamagan foydalanuvchilar uchun umumiy tavsiyalar',
        works: topWorks.length > 0 ? topWorks : allWorks.slice(0, 6),
      });
    }

    // 4. Kuzatayotganlarim: Works from followed authors / followed works
    if (tab === 'kuzatayotganlarim') {
      if (!profile) {
        return NextResponse.json(
          { success: false, requiresAuth: true, error: 'Kuzatilayotgan asarlarni ko‘rish uchun tizimga kiring' },
          { status: 401 },
        );
      }

      const [authorFollowsRes, workFollowsRes] = await Promise.all([
        admin.from('author_follows').select('author_id').eq('user_id', profile.id),
        admin.from('work_follows').select('work_id').eq('user_id', profile.id),
      ]);

      const followedAuthorIds = (authorFollowsRes.data || []).map((a: any) => a.author_id);
      const followedWorkIds = (workFollowsRes.data || []).map((w: any) => w.work_id);

      if (followedAuthorIds.length === 0 && followedWorkIds.length === 0) {
        return NextResponse.json({
          success: true,
          tab: 'kuzatayotganlarim',
          works: [],
          emptyReason: 'no_follows',
        });
      }

      // Query works that match either followed authors or followed works
      let q = admin
        .from('works')
        .select(`
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `)
        .eq('status', 'published');

      if (followedAuthorIds.length > 0 && followedWorkIds.length > 0) {
        q = q.or(`author_id.in.(${followedAuthorIds.join(',')}),id.in.(${followedWorkIds.join(',')})`);
      } else if (followedAuthorIds.length > 0) {
        q = q.in('author_id', followedAuthorIds);
      } else {
        q = q.in('id', followedWorkIds);
      }

      const { data: followedWorks, error } = await q
        .order('updated_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        tab: 'kuzatayotganlarim',
        works: followedWorks || [],
      });
    }

    return NextResponse.json({ success: false, error: 'Noma’lum tab' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/home/discovery:', err);
    return NextResponse.json({ success: false, error: err.message || 'Server xatosi' }, { status: 500 });
  }
}
