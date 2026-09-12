import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

async function archiveDeletedWork(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiya talab qilinadi' },
        { status: 401 },
      );
    }
    const { workId } = await request.json();
    const id = String(workId || '');
    if (!id)
      return NextResponse.json(
        { success: false, error: 'Asar IDsi talab qilinadi' },
        { status: 400 },
      );

    const db = createAdminClient();
    const { data: work } = await db
      .from('works')
      .select('id,author_id,title,slug,status,is_archived')
      .eq('id', id)
      .maybeSingle();
    const isAdmin = profile.is_admin === true || profile.role === 'admin';
    if (!work || (work.author_id !== profile.id && !isAdmin)) {
      return NextResponse.json(
        { success: false, error: 'Faqat o‘zingizning asaringizni o‘chira olasiz' },
        { status: 403 },
      );
    }

    // Always soft-delete works. Purchases, entitlements, wallet movements,
    // payouts and audit history remain intact and are never cascade-deleted.
    const { data: archivedWork, error } = await db
      .from('works')
      .update({ status: 'archived', is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!archivedWork) {
      return NextResponse.json(
        { success: false, error: 'Asarni o‘chirish tasdiqlanmadi' },
        { status: 409 },
      );
    }

    revalidateTag('public-catalogue');
    revalidateTag('seo-sitemap');
    revalidatePath('/');
    revalidatePath('/asarlar');
    revalidatePath('/hikoyalar');
    revalidatePath('/plus');
    revalidatePath(`/asarlar/${work.slug}`);
    revalidatePath('/muallif');
    return NextResponse.json({
      success: true,
      archived: true,
      message: 'Asar xavfsiz o‘chirildi. Moliyaviy tarix saqlandi.',
    });
  } catch (error) {
    console.error('Work deletion failed', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json(
      { success: false, error: 'Asarni o‘chirib bo‘lmadi' },
      { status: 500 },
    );
  }
}

// POST is the primary browser action because request bodies on DELETE can be
// stripped by some proxies. Keep DELETE for API compatibility.
export const POST = archiveDeletedWork;
export const DELETE = archiveDeletedWork;
