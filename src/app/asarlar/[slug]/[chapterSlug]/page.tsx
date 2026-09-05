import React from 'react';
import { notFound } from 'next/navigation';
import { getChapterForReading } from '@/lib/db/queries';
import { getCurrentProfile } from '@/lib/supabase/server';
import { ReaderView } from '@/components/reader/ReaderView';
import type { Metadata } from 'next';

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

export async function generateMetadata({ params }: ReadingPageProps): Promise<Metadata> {
  const { work, chapter } = await getChapterForReading(params.slug, params.chapterSlug, null);
  if (!work || !chapter) {
    return { title: 'Bob mutolaasi' };
  }

  const authorName = work.author?.pen_name || 'Muallif';
  return {
    title: `${chapter.title} — ${work.title}`,
    description: `«${work.title}» asarining ${chapter.chapter_number}-bobi. Muallif: ${authorName}. Manbora platformasida o‘qing.`,
    alternates: {
      canonical: `/asarlar/${params.slug}/${params.chapterSlug}`,
    },
    openGraph: {
      title: `${chapter.title} — ${work.title}`,
      description: `«${work.title}» asarining ${chapter.chapter_number}-bobi. Muallif: ${authorName}.`,
      url: `/asarlar/${params.slug}/${params.chapterSlug}`,
      images: work.cover_url ? [{ url: work.cover_url, alt: work.title }] : [],
    },
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Chapter',
            name: chapter.title,
            position: chapter.chapter_number,
            isPartOf: {
              '@type': 'Book',
              name: work.title,
              url: `https://manbora.uz/asarlar/${work.slug}`,
            },
            url: `https://manbora.uz/asarlar/${work.slug}/${chapter.slug}`,
            inLanguage: 'uz',
          }),
        }}
      />
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
    </>
  );
}
