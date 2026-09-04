import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    return NextResponse.json({
      success: true,
      profile: profile || null,
      isAdmin: Boolean(profile?.is_admin),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Profilni olishda xatolik', profile: null, isAdmin: false },
      { status: 500 },
    );
  }
}
