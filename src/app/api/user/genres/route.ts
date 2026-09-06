import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    const admin = createAdminClient();

    // 1. Fetch active genres
    const { data: genresData, error: gErr } = await admin
      .from('genres')
      .select('id, name, slug, description, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (gErr) {
      console.error('Error querying genres:', gErr);
    }

    const genres = genresData || [];

    if (!profile) {
      return NextResponse.json({
        success: true,
        genres,
        allGenres: genres,
        selectedGenreIds: [],
        preferredGenreIds: [],
        onboardingCompleted: true,
      });
    }

    // 2. Fetch user's genre preferences
    const { data: userPrefs } = await admin
      .from('user_genre_preferences')
      .select('genre_id')
      .eq('user_id', profile.id);

    const selectedGenreIds = (userPrefs || []).map((p: any) => p.genre_id);

    return NextResponse.json({
      success: true,
      genres,
      allGenres: genres,
      selectedGenreIds,
      preferredGenreIds: selectedGenreIds,
      onboardingCompleted: Boolean((profile as any).onboarding_completed),
    });
  } catch (err: any) {
    console.error('Error fetching user genres:', err);
    return NextResponse.json(
      { success: false, error: 'Janrlarni yuklashda xatolik yuz berdi' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiya talab etiladi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const admin = createAdminClient();

    // Case 1: User explicitly skips onboarding
    if (body.skip) {
      await admin
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      return NextResponse.json({
        success: true,
        skipped: true,
        onboardingCompleted: true,
      });
    }

    const genreIds: string[] = Array.isArray(body.genreIds)
      ? Array.from(new Set(body.genreIds.map(String).filter(Boolean)))
      : [];

    if (genreIds.length < 3 || genreIds.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Iltimos, kamida 3 ta va ko‘pi bilan 5 ta janr tanlang' },
        { status: 400 }
      );
    }

    // 2. Clear old preferences and insert new
    await admin
      .from('user_genre_preferences')
      .delete()
      .eq('user_id', profile.id);

    const rowsToInsert = genreIds.map((gId) => ({
      user_id: profile.id,
      genre_id: gId,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await admin
      .from('user_genre_preferences')
      .insert(rowsToInsert);

    if (insertError) {
      console.error('Insert genre preferences error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Janrlarni saqlashda xatolik yuz berdi' },
        { status: 500 }
      );
    }

    // Mark onboarding completed on profile
    await admin
      .from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    return NextResponse.json({
      success: true,
      selectedGenreIds: genreIds,
      preferredGenreIds: genreIds,
      onboardingCompleted: true,
      message: 'Sevimli janrlaringiz muvaffaqiyatli saqlandi',
    });
  } catch (err: any) {
    console.error('Error saving user genres:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 }
    );
  }
}
