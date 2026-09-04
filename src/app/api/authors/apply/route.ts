import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiyadan o‘tishingiz lozim' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const penName = String(body.penName || '').trim();
    const biography = String(body.biography || '').trim();

    if (!penName) {
      return NextResponse.json(
        { success: false, error: 'Taxallus yoki mualliflik ismini kiritishingiz shart' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Check if author profile exists
    const { data: existing } = await supabase
      .from('author_profiles')
      .select('status')
      .eq('user_id', profile.id)
      .single();

    if (existing && existing.status === 'approved') {
      return NextResponse.json(
        { success: false, error: 'Siz allaqachon tasdiqlangan muallifsiz' },
        { status: 400 },
      );
    }

    const { error: upsertError } = await supabase
      .from('author_profiles')
      .upsert({
        user_id: profile.id,
        pen_name: penName,
        biography,
        status: 'pending',
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      return NextResponse.json(
        { success: false, error: upsertError.message || 'Arizani saqlashda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mualliflik arizangiz ko‘rib chiqish uchun qabul qilindi',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
