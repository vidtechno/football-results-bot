import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi. Qaytadan kiring.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { name, slug, sort_order } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Viloyat nomi kiritilishi shart' }, { status: 400 });
    }

    const { data: region, error } = await supabase
      .from('regions')
      .insert([
        {
          name: name.trim(),
          slug: slug ? slugify(slug) : slugify(name),
          sort_order: sort_order || 0,
        },
      ])
      .select()
      .single();

    if (error || !region) {
      return NextResponse.json({ error: error?.message || 'Hududni yaratishda xatolik' }, { status: 500 });
    }

    await logAdminAction(supabase, session.username, 'create', 'region', region.id, { name: region.name });

    return NextResponse.json({ success: true, region });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
