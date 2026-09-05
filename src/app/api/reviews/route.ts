import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get('workId');

    if (!workId) {
      return NextResponse.json({ error: 'workId talab qilinadi' }, { status: 400 });
    }

    const profile = await getCurrentProfile();
    const admin = createAdminClient();

    // Fetch non-hidden reviews with author profile info
    const { data: reviews, error } = await admin
      .from('work_reviews')
      .select(`
        id, rating, title, content, contains_spoilers, helpful_count, created_at, updated_at,
        user:profiles (id, display_name, username, avatar_url)
      `)
      .eq('work_id', workId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return NextResponse.json({ reviews: [], userVotedReviewIds: [], eligibility: null });
    }

    // If profile logged in, check which reviews they upvoted
    let userVotedReviewIds: string[] = [];
    let eligibility = { canReview: false, reason: 'Iltimos, tizimga kiring' };

    if (profile) {
      const reviewIds = (reviews || []).map((r) => r.id);
      if (reviewIds.length > 0) {
        const { data: votes } = await admin
          .from('review_helpful_votes')
          .select('review_id')
          .eq('user_id', profile.id)
          .in('review_id', reviewIds);

        userVotedReviewIds = (votes || []).map((v) => v.review_id);
      }

      // Check review eligibility:
      // 1. Is author?
      const { data: work } = await admin
        .from('works')
        .select('author_id')
        .eq('id', workId)
        .maybeSingle();

      if (work && work.author_id === profile.id) {
        eligibility = { canReview: false, reason: 'Muallif o‘z asariga taqriz qoldira olmaydi' };
      } else {
        // 2. Already reviewed?
        const alreadyReviewed = (reviews || []).some((r: any) => r.user?.id === profile.id);
        if (alreadyReviewed) {
          eligibility = { canReview: false, reason: 'Siz bu asarga taqriz qoldirgansiz' };
        } else {
          // 3. Has read at least 1 chapter or 10% progress, or purchased
          const [progressRes, purchaseRes] = await Promise.all([
            admin
              .from('reading_progress')
              .select('percentage, is_completed, page_index')
              .eq('user_id', profile.id)
              .eq('work_id', workId)
              .maybeSingle(),
            admin
              .from('purchases')
              .select('id')
              .eq('buyer_id', profile.id)
              .eq('work_id', workId)
              .eq('status', 'completed')
              .limit(1),
          ]);

          const prog = progressRes.data;
          const hasPurchased = (purchaseRes.data || []).length > 0;
          const hasReadEnough = prog && (prog.percentage >= 10 || prog.is_completed || prog.page_index > 1);

          if (hasReadEnough || hasPurchased) {
            eligibility = { canReview: true, reason: '' };
          } else {
            eligibility = {
              canReview: false,
              reason: 'Taqriz qoldirish uchun kamida 1 ta bobni yoki asarning 10% ini o‘qishingiz kerak',
            };
          }
        }
      }
    }

    return NextResponse.json({
      reviews: reviews || [],
      userVotedReviewIds,
      eligibility,
    });
  } catch (err: any) {
    console.error('Reviews GET error:', err);
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
    const { workId, rating, title, content, containsSpoilers } = body;

    if (!workId || !rating || !content) {
      return NextResponse.json({ error: 'Barcha maydonlar to‘ldirilishi shart' }, { status: 400 });
    }

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: 'Baho 1 dan 5 gacha bo‘lishi kerak' }, { status: 400 });
    }

    if (content.trim().length < 10) {
      return NextResponse.json({ error: 'Taqriz matni kamida 10 ta belgidan iborat bo‘lishi kerak' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify not the author
    const { data: work } = await admin
      .from('works')
      .select('author_id, rating_count, average_rating')
      .eq('id', workId)
      .maybeSingle();

    if (!work) {
      return NextResponse.json({ error: 'Asar topilmadi' }, { status: 404 });
    }

    if (work.author_id === profile.id) {
      return NextResponse.json({ error: 'Muallif o‘z asariga taqriz yoza olmaydi' }, { status: 403 });
    }

    // Verify reading eligibility
    const [progressRes, purchaseRes] = await Promise.all([
      admin
        .from('reading_progress')
        .select('percentage, is_completed, page_index')
        .eq('user_id', profile.id)
        .eq('work_id', workId)
        .maybeSingle(),
      admin
        .from('purchases')
        .select('id')
        .eq('buyer_id', profile.id)
        .eq('work_id', workId)
        .eq('status', 'completed')
        .limit(1),
    ]);

    const prog = progressRes.data;
    const hasPurchased = (purchaseRes.data || []).length > 0;
    const hasReadEnough = prog && (prog.percentage >= 10 || prog.is_completed || prog.page_index > 1);

    if (!hasReadEnough && !hasPurchased) {
      return NextResponse.json(
        { error: 'Taqriz qoldirish uchun kamida 1 ta bobni yoki asarning 10% ini o‘qishingiz kerak' },
        { status: 403 }
      );
    }

    // Insert or update review
    const { data: review, error: insertError } = await admin
      .from('work_reviews')
      .insert({
        work_id: workId,
        user_id: profile.id,
        rating: numRating,
        title: title ? title.trim() : null,
        content: content.trim(),
        contains_spoilers: Boolean(containsSpoilers),
      })
      .select(`
        id, rating, title, content, contains_spoilers, helpful_count, created_at,
        user:profiles(id, display_name, username, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Error creating review:', insertError);
      return NextResponse.json({ error: 'Taqriz saqlanmadi yoki allaqachon mavjud' }, { status: 400 });
    }

    // Update work's rating stats
    const { data: allWorkRatings } = await admin
      .from('work_reviews')
      .select('rating')
      .eq('work_id', workId)
      .eq('is_hidden', false);

    if (allWorkRatings && allWorkRatings.length > 0) {
      const count = allWorkRatings.length;
      const sum = allWorkRatings.reduce((acc, r) => acc + r.rating, 0);
      const avg = Number((sum / count).toFixed(1));

      await admin
        .from('works')
        .update({
          average_rating: avg,
          rating_count: count,
        })
        .eq('id', workId);
    }

    return NextResponse.json({ success: true, review });
  } catch (err: any) {
    console.error('Reviews POST error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
