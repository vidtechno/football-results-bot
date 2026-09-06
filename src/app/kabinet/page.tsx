import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { getRecentReadingProgress } from '@/lib/services/progress';
import KabinetClient from './KabinetClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Shaxsiy kabinet',
  description: 'Foydalanuvchining shaxsiy profili, xaridlari, balansi va xavfsizlik sozlamalari.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function KabinetPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/kirish?returnUrl=%2Fkabinet');
  }

  const admin = createAdminClient();

  const [recentProgress, bookmarksRes] = await Promise.all([
    getRecentReadingProgress(profile.id, 6),
    admin
      .from('reading_bookmarks')
      .select(`
        id, user_id, work_id, chapter_id, page_number, progress_percent, text_anchor, created_at, updated_at,
        work:works (
          id, title, slug, cover_url, type, access_type, status,
          author:author_profiles (pen_name)
        ),
        chapter:chapters (id, chapter_number, title, slug)
      `)
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);

  const initialProgress = recentProgress.map((item) => ({
    ...item,
    work_id: item.workId,
    last_chapter: item.chapter,
    chapter: item.chapter,
    page_index: item.pageIndex,
    percentage: item.percentage,
    reading_progress: item.percentage,
    read_url: item.resumeUrl,
  }));

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
      <KabinetClient
        initialProgress={initialProgress}
        initialBookmarks={bookmarksRes.data || []}
      />
    </Suspense>
  );
}
