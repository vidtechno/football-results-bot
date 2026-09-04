import React from 'react';
import { notFound } from 'next/navigation';
import { getChapterForReading } from '@/lib/db/queries';
import { getCurrentProfile } from '@/lib/supabase/server';
import { ReaderView } from '@/components/reader/ReaderView';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Fresh access check on each read, zero shared caching

interface ReadingPageProps {
  params: {
    slug: string;
    chapterSlug: string;
  };
  searchParams?: {
    page?: string;
  };
}

export default async function ReadingPage({ params, searchParams }: ReadingPageProps) {
  const profile = await getCurrentProfile();
  const userId = profile?.id || null;

  const {
    work,
    chapter,
    hasAccess,
    accessReason,
    userBalance,
    allChapters,
    chapterAccessMap,
    savedProgress,
  } = await getChapterForReading(params.slug, params.chapterSlug, userId);

  if (!work || !chapter) {
    notFound();
  }

  const initialPage = searchParams?.page ? parseInt(searchParams.page, 10) : undefined;

  return (
    <ReaderView
      work={work}
      currentChapter={chapter}
      allChapters={allChapters}
      hasAccess={hasAccess}
      accessReason={accessReason}
      userBalance={userBalance}
      isLoggedIn={Boolean(profile)}
      chapterAccessMap={chapterAccessMap}
      savedProgress={savedProgress}
      initialPage={initialPage}
    />
  );
}

