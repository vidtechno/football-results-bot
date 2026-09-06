import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Avtorizatsiya talab etiladi' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all
    const selectedWorkId = searchParams.get('workId') || searchParams.get('work_id');

    const admin = createAdminClient();

    // 1. Verify user is an author
    const { data: author } = await admin
      .from('author_profiles')
      .select('user_id, pen_name, status')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!author && !profile.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat mualliflar uchun' },
        { status: 403 }
      );
    }

    // 2. Fetch author's works
    let worksQuery = admin
      .from('works')
      .select('id, title, slug, cover_url, type, access_type, completion_status, view_count, average_rating, rating_count, created_at')
      .eq('author_id', profile.id);

    if (selectedWorkId && selectedWorkId !== 'all') {
      worksQuery = worksQuery.eq('id', selectedWorkId);
    }

    const { data: worksData } = await worksQuery;
    const works = worksData || [];
    const workIds = works.map((w) => w.id);

    const defaultZeroMetrics = {
      totalReads: 0,
      uniqueReaders: 0,
      followersCount: 0,
      totalFollowers: 0,
      totalEarnings: 0,
      totalEarningsUzs: 0,
      bookmarksCount: 0,
      totalBookmarks: 0,
      libraryCount: 0,
      totalLibraryAdds: 0,
      reactionsCount: 0,
      totalReactions: 0,
      reviewsCount: 0,
      totalComments: 0,
    };

    const worksList = works.map((w) => ({ id: w.id, title: w.title, slug: w.slug }));

    if (workIds.length === 0) {
      return NextResponse.json({
        success: true,
        period,
        metrics: defaultZeroMetrics,
        summary: defaultZeroMetrics,
        chapterFunnel: [],
        dropOffChapter: null,
        dropOffAlert: null,
        works,
        worksList,
      });
    }

    // 3. Compute period cutoff
    let cutoffIso: string | null = null;
    const now = new Date();
    if (period === '7d') {
      cutoffIso = new Date(now.getTime() - 7 * 86400000).toISOString();
    } else if (period === '30d') {
      cutoffIso = new Date(now.getTime() - 30 * 86400000).toISOString();
    } else if (period === '90d') {
      cutoffIso = new Date(now.getTime() - 90 * 86400000).toISOString();
    }

    // 4. Concurrently fetch analytics data
    let progressQuery = admin
      .from('reading_progress')
      .select('id, user_id, work_id, chapter_id, percentage, is_completed, last_read_at')
      .in('work_id', workIds)
      .neq('user_id', profile.id); // Exclude author preview

    if (cutoffIso) {
      progressQuery = progressQuery.gte('last_read_at', cutoffIso);
    }

    const [
      progressRes,
      chaptersRes,
      bookmarksRes,
      libraryRes,
      reactionsRes,
      commentsRes,
      reviewsRes,
      followersRes,
      earningsRes,
    ] = await Promise.all([
      progressQuery,
      admin
        .from('chapters')
        .select('id, work_id, chapter_number, title, slug')
        .in('work_id', workIds)
        .eq('status', 'published')
        .order('chapter_number', { ascending: true }),
      admin.from('reading_bookmarks').select('id', { count: 'exact', head: true }).in('work_id', workIds),
      admin.from('library_items').select('id', { count: 'exact', head: true }).in('work_id', workIds),
      admin.from('chapter_reactions').select('id', { count: 'exact', head: true }).in('work_id', workIds),
      admin.from('chapter_comments').select('id', { count: 'exact', head: true }).in('work_id', workIds),
      admin.from('work_reviews').select('id', { count: 'exact', head: true }).in('work_id', workIds),
      admin.from('author_follows').select('id', { count: 'exact', head: true }).eq('author_id', profile.id),
      admin.from('wallet_accounts').select('balance').eq('user_id', profile.id).eq('account_type', 'author_earnings_available').maybeSingle(),
    ]);

    const progressRows = progressRes.data || [];
    const chapters = chaptersRes.data || [];

    // Unique readers count
    const uniqueReaderIds = new Set(progressRows.map((r) => r.user_id));
    const totalReads = progressRows.length;

    // Chapter funnel & drop-off analysis
    const chapterReadCounts = new Map<string, number>();
    progressRows.forEach((r) => {
      if (r.chapter_id) {
        chapterReadCounts.set(r.chapter_id, (chapterReadCounts.get(r.chapter_id) || 0) + 1);
      }
    });

    const chapterFunnel = chapters.map((chap, idx) => {
      const readCount = chapterReadCounts.get(chap.id) || 0;
      let dropOffRatePercent = 0;
      if (idx > 0) {
        const prevReads = chapterReadCounts.get(chapters[idx - 1].id) || 0;
        if (prevReads > 0 && prevReads > readCount) {
          dropOffRatePercent = Math.round(((prevReads - readCount) / prevReads) * 100);
        }
      }
      return {
        id: chap.id,
        chapterId: chap.id,
        work_id: chap.work_id,
        chapter_number: chap.chapter_number,
        chapterNumber: chap.chapter_number,
        title: chap.title,
        reads: readCount,
        dropOffRatePercent,
      };
    });

    // Find highest drop-off chapter (greatest drop in readers from previous chapter)
    let dropOffChapter: any = null;
    let dropOffAlert: any = null;
    let maxDrop = -1;

    for (let i = 1; i < chapterFunnel.length; i++) {
      const prev = chapterFunnel[i - 1];
      const curr = chapterFunnel[i];
      if (prev.reads > 0) {
        const drop = prev.reads - curr.reads;
        if (drop > maxDrop && drop > 0) {
          maxDrop = drop;
          dropOffChapter = {
            fromChapterNumber: prev.chapterNumber,
            toChapterNumber: curr.chapterNumber,
            fromTitle: prev.title,
            toTitle: curr.title,
            dropCount: drop,
            retentionPercent: Math.round((curr.reads / prev.reads) * 100),
          };
          dropOffAlert = {
            chapterNumber: curr.chapterNumber,
            title: curr.title,
            dropOffCount: drop,
          };
        }
      }
    }

    const earningsBalance = earningsRes.data?.balance || 0;
    const followersTotal = followersRes.count || 0;
    const bookmarksTotal = bookmarksRes.count || 0;
    const libraryTotal = libraryRes.count || 0;
    const reactionsTotal = reactionsRes.count || 0;
    const commentsTotal = commentsRes.count || 0;
    const reviewsTotal = reviewsRes.count || 0;

    const unifiedMetrics = {
      totalReads,
      uniqueReaders: uniqueReaderIds.size,
      followersCount: followersTotal,
      totalFollowers: followersTotal,
      totalEarnings: earningsBalance,
      totalEarningsUzs: earningsBalance,
      bookmarksCount: bookmarksTotal,
      totalBookmarks: bookmarksTotal,
      libraryCount: libraryTotal,
      totalLibraryAdds: libraryTotal,
      reactionsCount: reactionsTotal,
      totalReactions: reactionsTotal,
      reviewsCount: reviewsTotal,
      totalComments: commentsTotal,
    };

    return NextResponse.json({
      success: true,
      period,
      metrics: unifiedMetrics,
      summary: unifiedMetrics,
      chapterFunnel,
      dropOffChapter,
      dropOffAlert,
      works,
      worksList,
    });
  } catch (err: any) {
    console.error('Error fetching author analytics:', err);
    return NextResponse.json({ success: false, error: 'Server xatosi' }, { status: 500 });
  }
}
