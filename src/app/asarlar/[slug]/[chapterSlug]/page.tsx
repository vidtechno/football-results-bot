import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getChapterForReading, getChapterMetadata } from '@/lib/db/queries';
import { getCurrentProfile } from '@/lib/supabase/server';
import { ReaderView } from '@/components/reader/ReaderView';
import type { Metadata } from 'next';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';
import { WorkAnalyticsTracker } from '@/components/analytics/WorkAnalyticsTracker';
import { serializeJsonLd } from '@/lib/seo/jsonLd';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Fresh access check on each read, zero shared caching

interface ReadingPageProps {
  params: Promise<{
    slug: string;
    chapterSlug: string;
  }>;
  searchParams?: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({ params: paramsPromise }: ReadingPageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const { work, chapter } = await getChapterMetadata(params.slug, params.chapterSlug);
  if (!work || !chapter) {
    return { title: 'Bob mutolaasi' };
  }

  const authorName = getPublicWorkAuthorName(work);
  const canonicalPath = `/asarlar/${params.slug}/${params.chapterSlug}`;
  const description = `«${work.title}» asarining ${chapter.chapter_number}-bobi — ${chapter.title}. Muallif: ${authorName}. Manbora platformasida o‘qing.`;
  const publiclyIndexable =
    chapter.isFirstPublished &&
    ((work.access_type === 'free' && !work.is_plus) ||
      Boolean(chapter.is_free) ||
      Boolean(chapter.is_preview_free));
  return {
    title: `${chapter.title} — ${work.title}`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: publiclyIndexable,
      follow: true,
      googleBot: {
        index: publiclyIndexable,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': publiclyIndexable ? -1 : 0,
      },
    },
    openGraph: {
      type: 'article',
      title: `${chapter.title} — ${work.title}`,
      description,
      url: canonicalPath,
      siteName: 'Manbora',
      locale: 'uz_UZ',
      images: work.cover_url ? [{ url: work.cover_url, alt: `${work.title} kitob muqovasi` }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${chapter.title} — ${work.title}`,
      description,
      images: work.cover_url ? [work.cover_url] : ['/opengraph-image'],
    },
  };
}

export default async function ReadingPage({ params: paramsPromise, searchParams: searchParamsPromise }: ReadingPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
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
  } = await getChapterForReading(params.slug, params.chapterSlug, userId, {
    isAdmin: Boolean(profile?.is_admin),
  });

  if (!work || !chapter) {
    notFound();
  }
  if (!profile && allChapters[0]?.id !== chapter.id) {
    const returnUrl = `/asarlar/${work.slug}/${chapter.slug}`;
    redirect(`/kirish?returnUrl=${encodeURIComponent(returnUrl)}&reason=continue-reading`);
  }

  const initialPage = searchParams?.page ? parseInt(searchParams.page, 10) : undefined;

  return (
    <>
      <WorkAnalyticsTracker workId={work.id} chapterId={chapter.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Chapter',
                name: chapter.title,
                position: chapter.chapter_number,
                isPartOf: {
                  '@type': work.type === 'serialized_story' ? 'ShortStory' : 'Book',
                  name: work.title,
                  url: `https://manbora.uz/asarlar/${work.slug}`,
                  author: { '@type': 'Person', name: getPublicWorkAuthorName(work) },
                },
                url: `https://manbora.uz/asarlar/${work.slug}/${chapter.slug}`,
                inLanguage: work.language || 'uz',
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Bosh sahifa',
                    item: 'https://manbora.uz',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: work.title,
                    item: `https://manbora.uz/asarlar/${work.slug}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: chapter.title,
                    item: `https://manbora.uz/asarlar/${work.slug}/${chapter.slug}`,
                  },
                ],
              },
            ],
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
