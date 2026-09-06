import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    const admin = createAdminClient();

    // 1. Fetch published works with author, genres, ratings
    const { data: allWorksData, error: worksError } = await admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_url,
        type,
        status,
        access_type,
        full_work_price,
        age_rating,
        completion_status,
        average_rating,
        rating_count,
        view_count,
        is_featured,
        published_at,
        created_at,
        author:author_profiles (
          user_id,
          pen_name,
          biography,
          profile:profiles (
            id,
            display_name,
            username,
            avatar_url
          )
        ),
        work_genres (
          genre:genres (
            id,
            name,
            slug
          )
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    if (worksError || !allWorksData) {
      return NextResponse.json({ recommendations: [] });
    }

    const works = allWorksData as any[];

    // If guest (no profile), return curated popular & featured works
    if (!profile) {
      const guestPicks = works
        .sort((a, b) => {
          const aScore = (a.is_featured ? 50 : 0) + (a.view_count || 0) * 0.1 + (a.average_rating || 0) * 10;
          const bScore = (b.is_featured ? 50 : 0) + (b.view_count || 0) * 0.1 + (b.average_rating || 0) * 10;
          return bScore - aScore;
        })
        .slice(0, 6)
        .map((w) => ({
          ...w,
          recommendation_reason: w.is_featured ? 'Muharrir tanlovi' : 'Kitobxonlar orasida ommabop',
        }));

      return NextResponse.json({ recommendations: guestPicks });
    }

    // 2. Fetch authenticated user signals concurrently
    const [
      { data: userGenresData },
      { data: readProgressData },
      { data: authorFollowsData },
      { data: workFollowsData },
    ] = await Promise.all([
      admin.from('user_genre_preferences').select('genre_id').eq('user_id', profile.id),
      admin.from('reading_progress').select('work_id, is_completed, percentage').eq('user_id', profile.id),
      admin.from('author_follows').select('author_id').eq('user_id', profile.id),
      admin.from('work_follows').select('work_id').eq('user_id', profile.id),
    ]);

    const preferredGenreIds = new Set((userGenresData || []).map((p: any) => p.genre_id));
    const followedAuthorIds = new Set((authorFollowsData || []).map((f: any) => f.author_id));
    const followedWorkIds = new Set((workFollowsData || []).map((w: any) => w.work_id));

    const completedWorkIds = new Set<string>();
    const readWorkIds = new Set<string>();

    (readProgressData || []).forEach((r: any) => {
      readWorkIds.add(r.work_id);
      if (r.is_completed || r.percentage >= 100) {
        completedWorkIds.add(r.work_id);
      }
    });

    // 3. Score each work
    interface ScoredWork {
      work: any;
      score: number;
      reason: string;
    }

    const scored: ScoredWork[] = [];
    const genreNames = new Map<string, string>();

    works.forEach((w) => {
      (w.work_genres || []).forEach((wg: any) => {
        if (wg.genre?.id && wg.genre?.name) {
          genreNames.set(wg.genre.id, wg.genre.name);
        }
      });
    });

    for (const w of works) {
      // De-prioritize completely finished works so user discovers new content
      if (completedWorkIds.has(w.id)) {
        continue;
      }

      let score = 0;
      let primaryReason = 'Sizga ma’qul kelishi mumkin';

      const workGenreIds: string[] = (w.work_genres || [])
        .map((wg: any) => wg.genre?.id)
        .filter(Boolean);

      // Check author follow
      if (w.author_id && followedAuthorIds.has(w.author_id)) {
        score += 35;
        primaryReason = `Kuzatayotgan muallifingiz (${w.author?.pen_name}) asari`;
      }

      // Check genre preferences match
      const matchingGenreId = workGenreIds.find((gId) => preferredGenreIds.has(gId));
      if (matchingGenreId) {
        score += 30;
        const gName = genreNames.get(matchingGenreId) || 'Sevimli';
        primaryReason = `${gName} janrini yoqtirganingiz uchun`;
      }

      // Check work follow
      if (followedWorkIds.has(w.id)) {
        score += 20;
        primaryReason = 'Kuzatuvlaringiz ro‘yxatidan';
      }

      // Popularity and rating bonuses
      if (w.is_featured) score += 15;
      score += Math.min(20, (w.average_rating || 0) * 4);
      score += Math.min(15, (w.view_count || 0) * 0.05);

      // If user hasn't read this work yet, give small discovery boost
      if (!readWorkIds.has(w.id)) {
        score += 5;
      }

      scored.push({
        work: w,
        score,
        reason: primaryReason,
      });
    }

    // Sort by descending score
    scored.sort((a, b) => b.score - a.score);

    // 4. Apply diversity clamp: max 2 works per author
    const authorCounts = new Map<string, number>();
    const diversified: any[] = [];

    for (const item of scored) {
      if (diversified.length >= 6) break;
      const aId = item.work.author_id || 'unknown';
      const count = authorCounts.get(aId) || 0;
      if (count < 2) {
        authorCounts.set(aId, count + 1);
        diversified.push({
          ...item.work,
          recommendation_reason: item.reason,
        });
      }
    }

    // Fallback if not enough scored works
    if (diversified.length < 6) {
      const existingIds = new Set(diversified.map((d) => d.id));
      for (const w of works) {
        if (diversified.length >= 6) break;
        if (!existingIds.has(w.id)) {
          diversified.push({
            ...w,
            recommendation_reason: 'Muharrir tavsiyasi',
          });
        }
      }
    }

    return NextResponse.json({
      recommendations: diversified,
    });
  } catch (err: any) {
    console.error('Error in /api/recommendations:', err);
    return NextResponse.json({ recommendations: [] });
  }
}
