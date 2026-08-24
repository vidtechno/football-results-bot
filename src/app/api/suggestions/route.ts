import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { SuggestionSchema } from '@/lib/types/directory';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Anti-spam honeypot check
    if (body.honeypot) {
      return NextResponse.json({ success: true, message: 'Taklif qabul qilindi' });
    }

    const parsed = SuggestionSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Noto‘g‘ri ma’lumot kiritildi';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const data = parsed.data;
    const supabase = createAdminClient();

    // 1. Insert suggestion row
    const { data: newSuggestion, error } = await supabase
      .from('organization_suggestions')
      .insert([
        {
          name: data.name.trim(),
          category_id: data.category_id || null,
          region_id: data.region_id || null,
          city_district: data.city_district?.trim() || null,
          phone_number: data.phone_number?.trim() || null,
          website_url: data.website_url?.trim() || null,
          source_url: data.source_url?.trim() || null,
          note: data.note?.trim() || null,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error || !newSuggestion) {
      return NextResponse.json({ error: error?.message || 'Taklifni saqlashda xatolik' }, { status: 500 });
    }

    // 2. Create server-side admin notification
    await supabase.from('admin_notifications').insert([
      {
        type: 'suggestion',
        title: 'Yangi Tashkilot Taklifi',
        summary: `Foydalanuvchi “${newSuggestion.name}” tashkilotini taklif qildi.`,
        link_url: '/diyoration/suggestions',
        target_id: String(newSuggestion.id),
        is_read: false,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Taklifingiz muvaffaqiyatli qabul qilindi. Rahmat!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
