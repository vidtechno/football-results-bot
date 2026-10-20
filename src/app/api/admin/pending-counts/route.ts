import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminProfile } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

/** Admin menyusidagi "kutilmoqda" nishonlari uchun yengil sanoq (faqat count, ma'lumotsiz). */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminProfile(request.headers.get('Authorization'));
    if (!admin) {
      return NextResponse.json({ success: false }, { status: 403 });
    }
    const db = createAdminClient();
    const head = { count: 'exact' as const, head: true };

    const [authors, works, workRevs, chapterRevs, payouts, reports] = await Promise.all([
      db.from('author_profiles').select('user_id', head).eq('status', 'pending'),
      db.from('works').select('id', head).eq('status', 'pending_review'),
      db.from('work_revisions').select('id', head).eq('status', 'pending_review'),
      db.from('chapter_revisions').select('id', head).eq('status', 'pending_review'),
      db.from('payout_requests').select('id', head).in('status', ['pending', 'under_review']),
      db.from('user_reports').select('id', head).eq('status', 'pending'),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        authors: authors.count || 0,
        works: works.count || 0,
        revisions: (workRevs.count || 0) + (chapterRevs.count || 0),
        payouts: payouts.count || 0,
        reports: reports.count || 0,
      },
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
