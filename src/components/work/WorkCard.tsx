'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, BookOpen, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { formatUZS } from '@/lib/utils/currency';
import type { Work } from '@/lib/types/platform';

interface WorkCardProps {
  work: Work | any;
  progressPercent?: number;
  lastReadChapterNumber?: number;
  priority?: boolean;
  context?: 'catalogue' | 'library' | 'carousel';
}

export function WorkCard({
  work,
  progressPercent,
  lastReadChapterNumber,
  priority = false,
  context = 'catalogue',
}: WorkCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Derive rating (from work rating or default standard)
  const rating = work.rating ? Number(work.rating).toFixed(1) : (work.average_rating ? Number(work.average_rating).toFixed(1) : null);
  const authorName = work.author?.pen_name || work.author_profile?.pen_name || (typeof work.author === 'string' ? work.author : 'Muallif');
  const genreName = work.genre?.name || (Array.isArray(work.work_genres) && work.work_genres[0]?.genre?.name) || (Array.isArray(work.genres) && work.genres[0]?.name) || null;

  // Price & Access pill label
  const isFree = work.access_type === 'free';
  const isPaidFull = work.access_type === 'paid_full_work';
  const priceLabel = isFree
    ? 'Bepul'
    : isPaidFull
    ? formatUZS(work.full_work_price || 0)
    : 'Boblar bo‘yicha';

  return (
    <article className="group relative flex flex-col h-full select-none">
      <Link
        href={`/asarlar/${work.slug || work.id}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-2xl"
        aria-label={`${work.title} - ${authorName}`}
      >
        {/* Cover Container - Strict 2:3 Aspect Ratio */}
        <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#ECE6DD] border border-[#E3DDD3] shadow-xs group-hover:shadow-md group-hover:border-amber-400/50 transition-all duration-300">
          {work.cover_url && !imageError ? (
            <Image
              src={work.cover_url}
              alt={work.title}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 16vw"
              priority={priority}
              onError={() => setImageError(true)}
              onLoad={() => setIsLoaded(true)}
              className={clsx(
                'object-cover transition-transform duration-500 group-hover:scale-104',
                !isLoaded && 'blur-xs scale-102',
              )}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[#ECE6DD] to-[#DDD5C9] text-stone-600">
              <BookOpen className="w-8 h-8 text-stone-400 mb-1.5" />
              <span className="font-bold text-xs line-clamp-3 text-stone-800 leading-tight">
                {work.title}
              </span>
            </div>
          )}

          {/* Floating Rating Pill (Upper-Left) */}
          {rating && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-md text-white text-[10px] font-black shadow-xs">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span>{rating}</span>
            </div>
          )}

          {/* Floating Status / Price Pill (Upper-Right) */}
          <div className="absolute top-2 right-2 z-10">
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs',
                isFree
                  ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/30'
                  : 'bg-stone-950/80 text-amber-300 border border-amber-500/30',
              )}
            >
              {priceLabel}
            </span>
          </div>

          {/* Reading Progress Bar (Library / Continue Reading Contexts) */}
          {typeof progressPercent === 'number' && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40 backdrop-blur-xs">
              <div
                className="h-full bg-amber-500 rounded-r-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
          )}
        </div>

        {/* Work Metadata Below Cover */}
        <div className="pt-2 flex flex-col flex-1">
          {/* Work Title (Clamped to 2 lines, Inkitt bold style) */}
          <h3 className="font-bold text-sm sm:text-base text-stone-900 leading-snug line-clamp-2 group-hover:text-amber-800 transition-colors tracking-tight">
            {work.title}
          </h3>

          {/* Author Pen Name */}
          <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
            {authorName}
          </p>

          {/* Genre / Work type / Reading progress note */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {genreName && (
              <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F4EFEB] text-[#78716C] border border-[#E7E2D9]">
                {genreName}
              </span>
            )}
            {work.work_type && (
              <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500 border border-stone-200">
                {work.work_type === 'story' ? 'Hikoya' : work.work_type === 'book' ? 'Kitob' : work.work_type}
              </span>
            )}
            {typeof lastReadChapterNumber === 'number' && (
              <span className="text-[10px] text-amber-700 font-semibold">
                {lastReadChapterNumber}-bobda
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
