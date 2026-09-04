import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const admin = await getCurrentProfile(request.headers.get('Authorization'));
    if (!admin || !admin.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administratorlar bu ma’lumotlarni ko‘ra oladi' },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const status = searchParams.get('status') || 'all';
    const accessType = searchParams.get('access') || 'all';

    const supabase = createAdminClient();

    let query = supabase
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_url,
        type,
        access_type,
        full_work_price,
        status,
        rejection_reason,
        created_at,
        published_at,
        author:author_profiles (
          user_id,
          pen_name
        ),
        chapters (
          id,
          chapter_number,
          title,
          slug,
          price,
          is_free,
          status
        ),
        purchases (
          id,
          gross_amount
        )
      `)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (accessType !== 'all') {
      query = query.eq('access_type', accessType);
    }

    const { data: rawWorks, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    let works = (rawWorks || []).map((w: any) => {
      const authorInfo = Array.isArray(w.author) ? w.author[0] : w.author;
      const purchasesList = Array.isArray(w.purchases) ? w.purchases : [];
      const totalPurchasesCount = purchasesList.length;
      const totalPurchasesRevenue = purchasesList.reduce(
        (sum: number, p: any) => sum + (Number(p.gross_amount) || 0),
        0
      );

      return {
        id: w.id,
        title: w.title,
        slug: w.slug,
        description: w.description,
        cover_url: w.cover_url,
        type: w.type,
        access_type: w.access_type,
        full_work_price: w.full_work_price,
        status: w.status,
        rejection_reason: w.rejection_reason,
        created_at: w.created_at,
        published_at: w.published_at,
        author_name: authorInfo?.pen_name || 'Muallif',
        author_id: authorInfo?.user_id,
        chapters: (w.chapters || []).sort(
          (a: any, b: any) => a.chapter_number - b.chapter_number
        ),
        sales_count: totalPurchasesCount,
        sales_revenue: totalPurchasesRevenue,
      };
    });

    if (q) {
      const lower = q.toLowerCase();
      works = works.filter(
        (w) =>
          w.title?.toLowerCase().includes(lower) ||
          w.author_name?.toLowerCase().includes(lower) ||
          w.id?.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({
      success: true,
      works,
      total: works.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server xatosi' },
      { status: 500 },
    );
  }
}
