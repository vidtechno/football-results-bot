import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Iltimos, avval tizimga kiring' }, { status: 401 });
    }

    const body = await req.json();
    const { reviewId } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId talab qilinadi' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check existing vote
    const { data: existing } = await admin
      .from('review_helpful_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', profile.id)
      .maybeSingle();

    let isVoted = false;
    if (existing) {
      await admin.from('review_helpful_votes').delete().eq('id', existing.id);
      isVoted = false;
    } else {
      await admin.from('review_helpful_votes').insert({
        review_id: reviewId,
        user_id: profile.id,
      });
      isVoted = true;
    }

    // Recalculate helpful count
    const { count } = await admin
      .from('review_helpful_votes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    const helpfulCount = count || 0;

    await admin
      .from('work_reviews')
      .update({ helpful_count: helpfulCount })
      .eq('id', reviewId);

    return NextResponse.json({
      success: true,
      isVoted,
      helpfulCount,
    });
  } catch (err: any) {
    console.error('Review vote error:', err);
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
