import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { createCatalogueClient } from '@/lib/supabase/catalogue';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'yangi';
    const isPublicTab = tab === 'yangi' || tab === 'ommabop';
    const profile = isPublicTab
      ? null
      : await getCurrentProfile(request.headers.get('Authorization'));
    const admin = isPublicTab ? createCatalogueClient() : createAdminClient();

    // 1. Yangi: Prioritize recently published or recently updated works (not archived)
    if (tab === 'yangi') {
      const { data, error } = await admin
        .from('works')
        .select(
          `
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `,
        )
        .eq('status', 'published')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ success: true, tab: 'yangi', works: data || [] });
    }

    // 2. Ommabop: Rank using engagement signals over recent period (not archived)
    if (tab === 'ommabop') {
      const { data, error } = await admin
        .from('works')
        .select(
          `
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `,
        )
        .eq('status', 'published')
        .eq('is_archived', false)
        .order('view_count', { ascending: false })
        .order('average_rating', { ascending: false })
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ success: true, tab: 'ommabop', works: data || [] });
    }

    // 3. Siz uchun: Personalized recommendations with robust fallback
    if (tab === 'siz-uchun') {
      // 1. Fetch all candidate published, non-archived works
      const { data: allPublishedWorks, error: worksError } = await admin
        .from('works')
        .select(
          `
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `,
        )
        .eq('status', 'published')
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .limit(40);

      if (worksError) throw worksError;
      const allWorks = allPublishedWorks || [];

      // If guest, return popular/recent published works as fallback
      if (!profile) {
        return NextResponse.json({
          success: true,
          tab: 'siz-uchun',
          isPersonalized: false,
          fallbackReason: 'Ro‘yxatdan o‘tmagan kitobxonlar uchun ommabop asarlar to‘plami',
          works: allWorks.slice(0, 8),
        });
      }

      // Authenticated reader: evaluate user signals (genres, progress, follows, ratings/reviews)
      const [userGenresRes, readProgressRes, authorFollowsRes, workFollowsRes] = await Promise.all([
        admin.from('user_genre_preferences').select('genre_id').eq('user_id', profile.id),
        admin
          .from('reading_progress')
          .select('work_id, is_completed, percentage')
          .eq('user_id', profile.id),
        admin.from('author_follows').select('author_id').eq('user_id', profile.id),
        admin.from('work_follows').select('work_id').eq('user_id', profile.id),
      ]);

      const preferredGenreIds = new Set((userGenresRes.data || []).map((p: any) => p.genre_id));
      const followedAuthorIds = new Set((authorFollowsRes.data || []).map((f: any) => f.author_id));
      const followedWorkIds = new Set((workFollowsRes.data || []).map((w: any) => w.work_id));
      const completedWorkIds = new Set<string>();
      const inProgressWorkIds = new Set<string>();

      (readProgressRes.data || []).forEach((r: any) => {
        if (r.is_completed || (r.percentage && r.percentage >= 100)) {
          completedWorkIds.add(r.work_id);
        } else {
          inProgressWorkIds.add(r.work_id);
        }
      });

      // Score works: Priority:
      // 1. Matches preferred genres
      // 2. Author or work followed
      // 3. Similar to currently reading
      // 4. View count and ratings
      const scored = allWorks.map((w: any) => {
        let score = 0;
        let reason = 'Tavsiya etilgan asar';

        const workGenreIds = (w.work_genres || []).map((wg: any) => wg.genre?.id).filter(Boolean);
        const hasPreferredGenre = workGenreIds.some((gId: string) => preferredGenreIds.has(gId));

        if (hasPreferredGenre) {
          score += 50;
          reason = 'Sevimli janrlaringiz asosida';
        }
        if (w.author_id && followedAuthorIds.has(w.author_id)) {
          score += 35;
          reason = 'Kuzatayotgan muallifingiz asari';
        }
        if (followedWorkIds.has(w.id)) {
          score += 30;
          reason = 'Kuzatuvlaringiz asosida';
        }
        if (inProgressWorkIds.has(w.id)) {
          score += 20;
          reason = 'Mutolaangiz davomi sifatida';
        }

        // Slight penalty for already completed works so new works surface first
        if (completedWorkIds.has(w.id)) {
          score -= 15;
        }

        score += (w.average_rating || 0) * 4;
        score += Math.min(10, (w.view_count || 0) * 0.02);

        return { work: w, score, reason, hasPreferredGenre };
      });

      scored.sort((a, b) => b.score - a.score);

      const hasUserPreferences =
        preferredGenreIds.size > 0 || followedAuthorIds.size > 0 || followedWorkIds.size > 0;

      // Filter to relevant recommendations if user has preferences, or fallback gracefully
      let recommended = scored.slice(0, 8).map((s) => ({
        ...s.work,
        recommendation_reason: hasUserPreferences
          ? s.reason
          : 'Sizga manzur bo‘lishi mumkin bo‘lgan asar',
      }));

      // If user had preferences but none matched, fallback to top popular/recent works
      if (recommended.length === 0 && allWorks.length > 0) {
        recommended = allWorks.slice(0, 8).map((w: any) => ({
          ...w,
          recommendation_reason: 'Ommabop asarlar saralashi',
        }));
      }

      return NextResponse.json({
        success: true,
        tab: 'siz-uchun',
        isPersonalized: hasUserPreferences,
        fallbackReason: hasUserPreferences
          ? null
          : 'Janr tanlamagan foydalanuvchilar uchun umumiy tavsiyalar',
        works: recommended,
        emptyReason: recommended.length === 0 ? 'no_recommendations' : null,
      });
    }

    // 4. Kuzatayotganlarim: Works from followed authors / followed works
    if (tab === 'kuzatayotganlarim') {
      if (!profile) {
        return NextResponse.json(
          {
            success: false,
            requiresAuth: true,
            error: 'Kuzatilayotgan asarlarni ko‘rish uchun tizimga kiring',
          },
          { status: 401 },
        );
      }

      const [authorFollowsRes, workFollowsRes] = await Promise.all([
        admin.from('author_follows').select('author_id').eq('user_id', profile.id),
        admin.from('work_follows').select('work_id').eq('user_id', profile.id),
      ]);

      const followedAuthorIds = Array.from(
        new Set((authorFollowsRes.data || []).map((a: any) => a.author_id)),
      );
      const followedWorkIds = Array.from(
        new Set((workFollowsRes.data || []).map((w: any) => w.work_id)),
      );

      if (followedAuthorIds.length === 0 && followedWorkIds.length === 0) {
        return NextResponse.json({
          success: true,
          tab: 'kuzatayotganlarim',
          works: [],
          emptyReason: 'no_follows',
        });
      }

      // Query eligible published works that match either followed authors or followed works
      let q = admin
        .from('works')
        .select(
          `
          *,
          author:author_profiles (
            user_id,
            pen_name,
            biography,
            status,
            profile:profiles (id, display_name, username, avatar_url)
          ),
          work_genres (genre:genres (*))
        `,
        )
        .eq('status', 'published')
        .eq('is_archived', false);

      if (followedAuthorIds.length > 0 && followedWorkIds.length > 0) {
        q = q.or(
          `author_id.in.(${followedAuthorIds.join(',')}),id.in.(${followedWorkIds.join(',')})`,
        );
      } else if (followedAuthorIds.length > 0) {
        q = q.in('author_id', followedAuthorIds);
      } else {
        q = q.in('id', followedWorkIds);
      }

      const { data: followedWorks, error } = await q
        .order('updated_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      // Deduplicate works (in case a work is matched by both author and work follow)
      const uniqueWorks: any[] = [];
      const seenIds = new Set<string>();
      (followedWorks || []).forEach((w: any) => {
        if (!seenIds.has(w.id)) {
          seenIds.add(w.id);
          uniqueWorks.push(w);
        }
      });

      return NextResponse.json({
        success: true,
        tab: 'kuzatayotganlarim',
        works: uniqueWorks,
        emptyReason: uniqueWorks.length === 0 ? 'only_ineligible' : null,
      });
    }

    return NextResponse.json({ success: false, error: 'Noma’lum tab' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/home/discovery:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
