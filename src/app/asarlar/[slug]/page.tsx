import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  BookOpen,
  User,
  Calendar,
  Lock,
  Unlock,
  Bookmark,
  ChevronRight,
  Clock,
  Languages,
} from 'lucide-react';
import { getWorkBySlug, getWorkMetadataBySlug } from '@/lib/db/queries';
import { getCurrentProfile, createServerClient } from '@/lib/supabase/server';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { WorkSocialToolbar } from '@/components/social/WorkSocialToolbar';
import { WorkReviewsSection } from '@/components/reviews/WorkReviewsSection';
import { getPublicWorkAuthorName, getPublicWorkAuthorUsername } from '@/lib/utils/workAttribution';
import { WorkAnalyticsTracker } from '@/components/analytics/WorkAnalyticsTracker';
import { PublicWorkStats } from '@/components/analytics/PublicWorkStats';
import { getWorkChaptersAccessMap } from '@/lib/security/access';
import { PlusBadge } from '@/components/plus/PlusBadge';
import { seoDescription, serializeJsonLd } from '@/lib/seo/jsonLd';

export const revalidate = 30;

interface WorkDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params: paramsPromise }: WorkDetailPageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const { work } = await getWorkMetadataBySlug(params.slug);
  if (!work || work.status === 'archived') {
    return { title: 'Asar topilmadi' };
  }

  const authorName = work.authorName;
  const canonicalPath = `/asarlar/${work.slug}`;
  const description = seoDescription(
    work.description,
    `«${work.title}» asari. Muallif: ${authorName}. O‘zbek tilida Manbora platformasida o‘qing.`,
  );
  const completeTitle = `${work.title} — ${authorName}`;
  const title = completeTitle.length <= 68 ? completeTitle : work.title;
  const image = work.cover_url
    ? [{ url: work.cover_url, alt: `${work.title} — ${authorName} kitob muqovasi` }]
    : [];

  return {
    title,
    description,
    authors: [
      {
        name: authorName,
        url: work.authorUsername ? `/mualliflar/${work.authorUsername}` : undefined,
      },
    ],
    category: work.genres[0]?.name,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: canonicalPath,
      siteName: 'Manbora',
      locale: 'uz_UZ',
      publishedTime: work.published_at || work.created_at,
      modifiedTime: work.updated_at,
      authors: [authorName],
      images: image,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: work.cover_url ? [work.cover_url] : ['/opengraph-image'],
    },
  };
}

export default async function WorkDetailPage({ params: paramsPromise }: WorkDetailPageProps) {
  const params = await paramsPromise;
  // Public book data and viewer identity are independent; start both together.
  const profilePromise = getCurrentProfile();
  const publicWorkPromise = getWorkBySlug(params.slug, null);
  const [profile, publicWork] = await Promise.all([profilePromise, publicWorkPromise]);
  const supabase = await createServerClient();
  const { work, chapters } = publicWork;

  if (!work || work.status === 'archived') {
    notFound();
  }

  const accessPromise = profile
    ? getWorkChaptersAccessMap(profile.id, work.id, chapters, {
        authorId: work.author_id,
        workAccessType: work.access_type,
        fullWorkPrice: Number(work.full_work_price || 0),
        workIsPlus: Boolean(work.is_plus),
        isAdmin: Boolean(profile.is_admin),
      })
    : Promise.resolve(publicWork.chapterAccessMap);

  const isFree = work.access_type === 'free' && !work.is_plus;
  const isPaidFullWork =
    (work.access_type as string) === 'paid_full_work' ||
    (work.access_type as string) === 'paid_book' ||
    ((work.access_type as string) !== 'paid_by_chapter' &&
      work.access_type !== 'free' &&
      Number(work.full_work_price || 0) > 0);

  const authorName = getPublicWorkAuthorName(work);
  const authorUsername = getPublicWorkAuthorUsername(work);
  const firstChapter = chapters.length > 0 ? chapters[0] : null;

  // Fetch social follower count and follow state server-side
  const followPromise = work.id
    ? Promise.all([
        supabase
          .from('work_follows')
          .select('id', { count: 'exact', head: true })
          .eq('work_id', work.id),
        profile?.id
          ? supabase
              .from('work_follows')
              .select('id')
              .eq('work_id', work.id)
              .eq('user_id', profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
    : Promise.resolve([{ count: 0 }, { data: null }] as any);
  const [chapterAccessMap, [{ count }, followCheck]] = await Promise.all([
    accessPromise,
    followPromise,
  ]);
  const followerCount = count || 0;
  const initialIsFollowing = Boolean(followCheck.data);
  // Check if first chapter is unlocked (which indicates active purchase entitlement or author access)
  const isWorkUnlocked = firstChapter ? !chapterAccessMap[firstChapter.id]?.isLocked : false;
  const workUrl = `https://manbora.uz/asarlar/${work.slug}`;
  const authorUrl = authorUsername ? `https://manbora.uz/mualliflar/${authorUsername}` : undefined;
  const workSchemaType = work.type === 'serialized_story' ? 'ShortStory' : 'Book';
  const genreNames = (work.genres || []).map((genre) => genre.name).filter(Boolean);
  const paidOffer =
    !isFree && !work.is_plus && Number(work.full_work_price || 0) > 0
      ? {
          '@type': 'Offer',
          url: workUrl,
          price: Number(work.full_work_price || 0),
          priceCurrency: 'UZS',
          availability: 'https://schema.org/InStock',
        }
      : undefined;
  const workStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': workSchemaType,
        '@id': `${workUrl}#work`,
        name: work.title,
        headline: work.title,
        url: workUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': workUrl },
        description: work.description || undefined,
        image: work.cover_url
          ? { '@type': 'ImageObject', url: work.cover_url, caption: `${work.title} muqovasi` }
          : undefined,
        datePublished: work.published_at || work.created_at || undefined,
        dateModified: work.updated_at || undefined,
        genre: genreNames.length > 0 ? genreNames : undefined,
        author: {
          '@type': 'Person',
          name: authorName,
          url: authorUrl,
        },
        publisher: {
          '@type': 'Organization',
          '@id': 'https://manbora.uz/#organization',
          name: 'Manbora',
          url: 'https://manbora.uz',
        },
        inLanguage: work.language || 'uz',
        isAccessibleForFree: isFree,
        wordCount: Number(work.total_words || 0) || undefined,
        offers: paidOffer,
        aggregateRating:
          Number(work.rating_count || 0) > 0
            ? {
                '@type': 'AggregateRating',
                ratingValue: Number(work.average_rating || 5),
                reviewCount: Number(work.rating_count || 1),
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
        translationOfWork:
          work.is_translation && work.original_title
            ? {
                '@type': 'CreativeWork',
                name: work.original_title,
                author: work.original_author_name
                  ? { '@type': 'Person', name: work.original_author_name }
                  : undefined,
              }
            : undefined,
        translator: work.translator_name
          ? { '@type': 'Person', name: work.translator_name }
          : undefined,
        hasPart: chapters.map((chapter) => ({
          '@type': 'Chapter',
          name: chapter.title,
          position: chapter.chapter_number,
          url: `${workUrl}/${chapter.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${workUrl}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: 'https://manbora.uz' },
          {
            '@type': 'ListItem',
            position: 2,
            name: work.is_translation ? 'Tarjima asarlar' : 'Asarlar',
            item: work.is_translation
              ? 'https://manbora.uz/tarjima-asarlar'
              : 'https://manbora.uz/asarlar',
          },
          { '@type': 'ListItem', position: 3, name: work.title, item: workUrl },
        ],
      },
    ],
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      <WorkAnalyticsTracker workId={work.id} />
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium truncate">
        <Link href="/" className="hover:text-amber-900 transition-colors">
          Bosh sahifa
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        <Link
          href={work.is_translation ? '/tarjima-asarlar' : '/asarlar'}
          className="hover:text-amber-900 transition-colors"
        >
          {work.is_translation ? 'Tarjima asarlar' : 'Asarlar'}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-stone-800 font-bold truncate">{work.title}</span>
      </nav>

      {/* Main Work Header Card */}
      <div className="editorial-card bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-10 items-start">
          {/* Cover Art (2:3 Aspect Ratio with book spine shadow) */}
          <div className="relative aspect-[2/3] w-full sm:w-56 md:w-64 max-w-[260px] mx-auto md:mx-0 flex-shrink-0 bg-stone-100 rounded-2xl overflow-hidden book-cover-shadow border border-stone-200">
            {work.cover_url ? (
              <Image
                src={work.cover_url}
                alt={work.title}
                fill
                priority
                sizes="(max-width: 768px) 260px, 300px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-12 h-12 text-amber-800 mb-2" />
                <span className="text-xs font-bold text-stone-500">{work.title}</span>
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 space-y-5 w-full">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {work.is_plus && <PlusBadge />}
                {work.is_translation && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-sky-50 text-sky-800 border border-sky-200">
                    <Languages className="w-3.5 h-3.5" /> Tarjima asar
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    isFree
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                      : 'bg-amber-50 text-amber-900 border border-amber-200/80'
                  }`}
                >
                  {isFree
                    ? 'Bepul mutolaa'
                    : isPaidFullWork
                      ? `To‘liq asar: ${formatUZS(work.full_work_price || 0)}`
                      : 'Bobma-bob to‘lov'}
                </span>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  {work.type === 'serialized_story' ? 'Hikoya' : 'Kitob'}
                </span>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">
                  {work.completion_status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-snug">
                {work.title}
              </h1>

              {/* Author link */}
              <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-stone-600">
                <User className="w-4 h-4 text-stone-400" />
                <span>{work.is_translation ? 'Original muallif:' : 'Muallif:'}</span>
                {authorUsername ? (
                  <Link
                    href={`/mualliflar/${authorUsername}`}
                    className="text-amber-900 hover:text-amber-700 font-bold hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <span className="font-bold text-stone-900">{authorName}</span>
                )}
              </div>
              {work.is_translation && (
                <div className="grid sm:grid-cols-2 gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-xs text-stone-700">
                  {work.original_title && (
                    <p>
                      <strong>Original nomi:</strong> {work.original_title}
                    </p>
                  )}
                  <p>
                    <strong>Tarjima tili:</strong> {work.source_language}dan o‘zbek tiliga
                  </p>
                  {work.translator_name && (
                    <p>
                      <strong>Tarjimon:</strong> {work.translator_name}
                    </p>
                  )}
                  <p>
                    <strong>Nashr asosi:</strong>{' '}
                    {work.translation_rights_basis === 'licensed'
                      ? 'Ruxsat/litsenziya asosida'
                      : 'Public domain'}
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal max-w-2xl whitespace-pre-line">
              {work.description || 'Ushbu asarga hali batafsil tavsif kiritilmagan.'}
            </p>

            {/* Genres */}
            {work.genres && work.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-stone-400">Janrlar:</span>
                {work.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/asarlar?genre=${g.slug}`}
                    className="px-3 py-1 rounded-xl bg-stone-100 hover:bg-amber-100/70 hover:text-amber-950 text-stone-700 text-xs font-semibold transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* CTAs & Social Toolbar */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              {firstChapter ? (
                isPaidFullWork && !isWorkUnlocked ? (
                  <Link
                    href={`/asarlar/${work.slug}/${firstChapter.slug}`}
                    className="px-7 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-stone-950" />
                    <span>Kitobni sotib olish — {formatUZS(work.full_work_price || 0)}</span>
                  </Link>
                ) : (
                  <Link
                    href={`/asarlar/${work.slug}/${firstChapter.slug}`}
                    className="px-7 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-stone-950" />
                    <span>Mutolaani boshlash</span>
                  </Link>
                )
              ) : (
                <div className="px-5 py-3 rounded-2xl bg-stone-100 text-stone-500 font-bold text-xs">
                  Hozircha boblar e’lon qilinmagan
                </div>
              )}

              <WorkSocialToolbar
                workId={work.id}
                workTitle={work.title}
                authorName={authorName}
                initialIsFollowing={initialIsFollowing}
                initialFollowerCount={followerCount}
              />

              {authorUsername && (
                <Link
                  href={`/mualliflar/${authorUsername}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-900 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
                >
                  <User className="h-4 w-4" />
                  <span>Muallif profilini ko‘rish</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublicWorkStats workId={work.id} initialFollowers={followerCount} />

      {/* Chapters Table of Contents */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-800" />
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Mundarija ({chapters.length} ta bob)
            </h2>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500 text-xs font-semibold shadow-xs">
            Tez orada birinchi boblar e’lon qilinadi.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
            {chapters.map((ch) => {
              const access = chapterAccessMap[ch.id];
              const isPurchased = access?.isPurchased;
              const isLocked = access ? access.isLocked : !ch.is_free || isPaidFullWork;

              return (
                <Link
                  key={ch.id}
                  href={`/asarlar/${work.slug}/${ch.slug}`}
                  prefetch={!isLocked}
                  className="group p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-amber-50/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-stone-100 group-hover:bg-amber-100 text-stone-700 group-hover:text-amber-900 flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 transition-colors">
                      {ch.chapter_number}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-amber-900 truncate transition-colors">
                        {ch.title}
                      </h4>
                      {ch.published_at && (
                        <span className="text-[11px] text-stone-400 font-medium">
                          {formatUzbekDate(ch.published_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {access?.accessReason === 'author' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200/70">
                        <Unlock className="w-3 h-3 text-purple-700" />
                        <span>Muallif uchun ochiq</span>
                      </span>
                    ) : access?.accessReason === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200/70">
                        <Unlock className="w-3 h-3 text-blue-700" />
                        <span>Admin uchun ochiq</span>
                      </span>
                    ) : access?.accessReason === 'purchased' ||
                      access?.accessReason === 'entitled' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                        <Unlock className="w-3 h-3 text-emerald-700" />
                        <span>Sotib olingan</span>
                      </span>
                    ) : access?.accessReason === 'plus' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70">
                        <Unlock className="w-3 h-3 text-amber-700" />
                        <span>Plus orqali</span>
                      </span>
                    ) : isFree ||
                      access?.accessReason === 'free' ||
                      (!work.is_plus && !isPaidFullWork && ch.is_free) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                        <Unlock className="w-3 h-3 text-emerald-700" />
                        <span>Bepul</span>
                      </span>
                    ) : isPaidFullWork ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70">
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>Kitobni sotib oling</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/70">
                        <Lock className="w-3 h-3 text-amber-700" />
                        <span>{formatUZS(ch.price)}</span>
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-amber-900 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Reviews & Ratings Section */}
      <WorkReviewsSection
        workId={work.id}
        workSlug={work.slug}
        workTitle={work.title}
        initialAverageRating={Number(work.average_rating || 0)}
        initialRatingCount={Number(work.rating_count || 0)}
      />

      {/* Structured Data (JSON-LD Book) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(workStructuredData),
        }}
      />

      {/* Mobile Sticky Read / Purchase CTA Bar */}
      {firstChapter && (
        <div className="md:hidden fixed bottom-[68px] left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-lg px-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-900 truncate">{work.title}</p>
            <p className="text-[11px] text-stone-500 truncate">
              {isFree
                ? 'Bepul mutolaa'
                : isPaidFullWork
                  ? `To‘liq asar: ${formatUZS(work.full_work_price || 0)}`
                  : 'Bobma-bob to‘lov'}
            </p>
          </div>
          <Link
            href={`/asarlar/${work.slug}/${firstChapter.slug}`}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-sm flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform"
          >
            {isPaidFullWork && !isWorkUnlocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Xarid qilish</span>
              </>
            ) : (
              <>
                <BookOpen className="w-3.5 h-3.5" />
                <span>O‘qish</span>
              </>
            )}
          </Link>
        </div>
      )}
    </div>
  );
}
