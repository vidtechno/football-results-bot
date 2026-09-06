import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import type { ChapterReactionType } from '@/lib/types/platform';

export const dynamic = 'force-dynamic';

const VALID_REACTIONS: ChapterReactionType[] = ['next_chapter', 'like', 'surprised', 'sad'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ success: false, error: 'chapterId talab etiladi' }, { status: 400 });
    }

    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    const admin = createAdminClient();

    // 1. Fetch all reactions for this chapter
    const { data: reactions, error } = await admin
      .from('chapter_reactions')
      .select('user_id, reaction_type')
      .eq('chapter_id', chapterId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const counts: Record<ChapterReactionType, number> = {
      next_chapter: 0,
      like: 0,
      surprised: 0,
      sad: 0,
    };

    let userReaction: ChapterReactionType | null = null;

    (reactions || []).forEach((r: any) => {
      const type = r.reaction_type as ChapterReactionType;
      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
      if (profile && r.user_id === profile.id) {
        userReaction = type;
      }
    });

    return NextResponse.json({
      success: true,
      counts,
      userReaction,
      totalCount: (reactions || []).length,
    });
  } catch (err: any) {
    console.error('Error fetching chapter reactions:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Reaksiya bildirish uchun tizimga kiring' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const chapterId = String(body.chapterId || '').trim();
    const workId = String(body.workId || '').trim();
    const reactionType = String(body.reactionType || '').trim() as ChapterReactionType;

    if (!chapterId || !VALID_REACTIONS.includes(reactionType)) {
      return NextResponse.json(
        { success: false, error: 'Yaroqsiz reaksiya turi' },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Check existing reaction for this user on this chapter
    const { data: existing } = await admin
      .from('chapter_reactions')
      .select('id, reaction_type')
      .eq('user_id', profile.id)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    let nextUserReaction: ChapterReactionType | null = null;
    const nowIso = new Date().toISOString();

    if (existing) {
      if (existing.reaction_type === reactionType) {
        // Toggle off (delete)
        await admin
          .from('chapter_reactions')
          .delete()
          .eq('id', existing.id);
        nextUserReaction = null;
      } else {
        // Switch reaction
        await admin
          .from('chapter_reactions')
          .update({ reaction_type: reactionType, updated_at: nowIso })
          .eq('id', existing.id);
        nextUserReaction = reactionType;
      }
    } else {
      // Insert new reaction
      await admin
        .from('chapter_reactions')
        .insert({
          chapter_id: chapterId,
          work_id: workId,
          user_id: profile.id,
          reaction_type: reactionType,
          created_at: nowIso,
          updated_at: nowIso,
        });
      nextUserReaction = reactionType;
    }

    // Re-aggregate counts
    const { data: allReactions } = await admin
      .from('chapter_reactions')
      .select('reaction_type')
      .eq('chapter_id', chapterId);

    const counts: Record<ChapterReactionType, number> = {
      next_chapter: 0,
      like: 0,
      surprised: 0,
      sad: 0,
    };

    (allReactions || []).forEach((r: any) => {
      const type = r.reaction_type as ChapterReactionType;
      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
    });

    return NextResponse.json({
      success: true,
      userReaction: nextUserReaction,
      counts,
      totalCount: (allReactions || []).length,
    });
  } catch (err: any) {
    console.error('Error toggling chapter reaction:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}
