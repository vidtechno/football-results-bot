import React from 'react';
import { notFound } from 'next/navigation';
import { getChapterForReading } from '@/lib/db/queries';
import { getCurrentProfile } from '@/lib/supabase/server';
import { ReaderView } from '@/components/reader/ReaderView';

export const revalidate = 0; // Fresh access check on each read

interface ReadingPageProps {
  params: {
    slug: string;
    chapterSlug: string;
  };
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const profile = await getCurrentProfile();
  const userId = profile?.id || null;

  const { work, chapter, hasAccess, userBalance, allChapters } =
    await getChapterForReading(params.slug, params.chapterSlug, userId);

  if (!work || !chapter) {
    notFound();
  }

  return (
    <ReaderView
      work={work}
      currentChapter={chapter}
      allChapters={allChapters}
      hasAccess={hasAccess}
      userBalance={userBalance}
      isLoggedIn={Boolean(profile)}
    />
  );
}
