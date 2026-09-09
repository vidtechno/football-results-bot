'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BookOpen, Clock, Sparkles, Languages } from 'lucide-react';
import { clsx } from 'clsx';
import { formatUZS } from '@/lib/utils/currency';
import type { Work } from '@/lib/types/platform';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';

interface WorkCardProps {
  work: Work | any;
  progressPercent?: number;
  lastReadChapterNumber?: number;
  priority?: boolean;
  context?: 'catalogue' | 'library' | 'carousel';
  showReadingTime?: boolean;
  readingTimeMinutes?: number;
}

export function WorkCard({
  work,
  progressPercent,
  lastReadChapterNumber,
  priority = false,
  context = 'catalogue',
  showReadingTime = false,
  readingTimeMinutes,
}: WorkCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Derive rating (from work rating or default standard)
  const rating = work.rating
    ? Number(work.rating).toFixed(1)
    : work.average_rating
      ? Number(work.average_rating).toFixed(1)
      : null;

  const authorName = getPublicWorkAuthorName({
    ...work,
    author: work.author_profile || work.author,
  });

  const genreName =
    work.genre?.name ||
    (Array.isArray(work.work_genres) && work.work_genres[0]?.genre?.name) ||
    (Array.isArray(work.genres) && work.genres[0]?.name) ||
    null;

  // Price & Access pill label
  const isFree = work.access_type === 'free';
  const isPaidFull = work.access_type === 'paid_full_work';
  const priceLabel = isFree
    ? 'Bepul'
    : isPaidFull
      ? formatUZS(work.full_work_price || 0)
      : 'Boblar bo‘yicha';

  // Completion status
  const isCompleted = work.completion_status === 'completed';
  const isStory = work.type === 'serialized_story';

  // Chapters count
  const chaptersCount =
    work.chapters_count ?? (Array.isArray(work.chapters) ? work.chapters.length : null);

  // Check if recently updated (within 7 days)
  const isRecentlyUpdated = (() => {
    try {
      const updatedDate = new Date(work.updated_at || work.published_at).getTime();
      const diffDays = (Date.now() - updatedDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    } catch {
      return false;
    }
  })();

  return (
    <article className="work-card group relative flex flex-col h-full select-none">
      <Link
        href={`/asarlar/${work.slug || work.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-2xl transition-transform duration-300"
        aria-label={`${work.title} - ${authorName}`}
      >
        {/* Cover Container - Strict 2:3 Aspect Ratio */}
        <div className="work-cover relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#ECE6DD] border border-[#E3DDD3] shadow-xs group-hover:shadow-xl group-hover:border-emerald-600/40 transition-all duration-500">
          {work.cover_url && !imageError ? (
            <Image
              src={work.cover_url}
              alt={work.title}
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1024px) 31vw, 20vw"
              priority={priority}
              onError={() => setImageError(true)}
              onLoad={() => setIsLoaded(true)}
              className={clsx(
                'object-cover transition-transform duration-500 group-hover:scale-104',
                !isLoaded && 'blur-xs scale-102',
              )}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#ECE6DD] via-[#F4EFEB] to-[#DDD5C9] text-stone-600">
              <BookOpen className="w-8 h-8 text-emerald-800/40 mb-1.5" />
              <span className="font-bold text-xs line-clamp-3 text-stone-800 leading-tight">
                {work.title}
              </span>
            </div>
          )}

          <div className="work-cover-shine absolute inset-0 z-[2] pointer-events-none" aria-hidden="true" />

          {/* Floating Rating Pill (Upper-Left) */}
          {rating ? (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-md text-white text-[10px] font-black shadow-xs">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span>{rating}</span>
            </div>
          ) : isRecentlyUpdated ? (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[9px] font-black tracking-wide uppercase border border-emerald-500/30 shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              <span>Yangilandi</span>
            </div>
          ) : null}

          {/* Floating Status / Price Pill (Upper-Right) */}
          <div className="absolute top-2 right-2 z-10">
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs',
                isFree
                  ? 'bg-emerald-900/85 text-emerald-200 border border-emerald-500/30'
                  : 'bg-stone-950/85 text-amber-300 border border-amber-500/30',
              )}
            >
              {priceLabel}
            </span>
          </div>

          {work.is_translation && (
            <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/90 text-indigo-100 border border-indigo-300/30 text-[9px] font-black uppercase tracking-wide shadow-xs backdrop-blur-md">
              <Languages className="w-3 h-3" />
              <span>Tarjima asar</span>
            </div>
          )}

          {/* Reading Progress Bar (Library / Continue Reading Contexts) */}
          {typeof progressPercent === 'number' && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs">
              <div
                className="h-full bg-emerald-500 rounded-r-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}
        </div>

        {/* Work Metadata Below Cover */}
        <div className="pt-2.5 flex flex-col flex-1">
          {/* Work Title (Clamped to 2 lines) */}
          <h3 className="font-bold text-xs sm:text-sm text-stone-900 leading-snug line-clamp-2 group-hover:text-emerald-900 transition-colors tracking-tight">
            {work.title}
          </h3>

          {/* Author Pen Name */}
          <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">{authorName}</p>

          {work.is_translation && work.source_language && (
            <p className="text-[10px] text-indigo-700 font-bold truncate mt-0.5">
              {work.source_language}dan tarjima
            </p>
          )}

          {/* Badges: Genre / Status / Chapters Count */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span
              className={clsx(
                'inline-block text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border',
                isStory
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200',
              )}
            >
              {isStory ? 'Hikoya' : 'Kitob'}
            </span>
            {genreName && (
              <span className="inline-block text-[9.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F4EFEB] text-stone-600 border border-[#E7E2D9]">
                {genreName}
              </span>
            )}
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 text-[9.5px] font-medium px-1.5 py-0.5 rounded-md border',
                isCompleted
                  ? 'bg-stone-100 text-stone-600 border-stone-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
              )}
            >
              {isCompleted ? 'Tugallangan' : 'Davom etmoqda'}
            </span>
            {typeof chaptersCount === 'number' && chaptersCount > 0 && (
              <span className="text-[9.5px] text-stone-500 font-medium">{chaptersCount} bob</span>
            )}
            {typeof lastReadChapterNumber === 'number' && (
              <span className="text-[9.5px] text-emerald-800 font-bold">
                {lastReadChapterNumber}-bobda
              </span>
            )}
            {(showReadingTime || typeof readingTimeMinutes === 'number') && (
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Clock className="w-2.5 h-2.5 text-emerald-700" />
                <span>
                  ~{readingTimeMinutes ?? Math.max(1, Math.ceil((work.total_words || 600) / 200))}{' '}
                  daqiqa
                </span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function WorkCardSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse space-y-2">
      <div className="w-full aspect-[2/3] rounded-2xl bg-stone-200" />
      <div className="h-4 bg-stone-200 rounded-md w-3/4" />
      <div className="h-3 bg-stone-200 rounded-md w-1/2" />
      <div className="h-3 bg-stone-200 rounded-md w-1/3" />
    </div>
  );
}
