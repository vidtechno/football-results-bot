import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getRecentReadingProgress } from '@/lib/services/progress';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ items: [], primaryItem: null });
    }

    const progressItems = await getRecentReadingProgress(profile.id, 5);

    return NextResponse.json({
      items: progressItems,
      primaryItem: progressItems[0] || null,
    });
  } catch (err: any) {
    console.error('Error in continue-reading API:', err);
    return NextResponse.json(
      { error: 'Mutolaa ma‘lumotlarini yuklashda xatolik yuz berdi', items: [], primaryItem: null },
      { status: 500 },
    );
  }
}
