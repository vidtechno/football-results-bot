import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, User } from 'lucide-react';
import type { Work } from '@/lib/types/platform';
import { formatUZS } from '@/lib/utils/currency';

interface WorkCardProps {
  work: Work;
}

export function WorkCard({ work }: WorkCardProps) {
  const isFree = work.access_type === 'free';
  const priceDisplay = isFree
    ? 'Bepul'
    : work.access_type === 'paid_full_work'
      ? formatUZS(work.full_work_price)
      : 'Bobma-bob';

  const authorName =
    work.author?.pen_name || work.author?.profile?.display_name || 'Muallif';

  return (
    <Link
      href={`/asarlar/${work.slug}`}
      className="editorial-card group flex flex-col overflow-hidden bg-white hover:border-amber-700/30 transition-all duration-200 rounded-2xl"
    >
      {/* Cover Aspect Ratio 2:3 with realistic book spine shadow */}
      <div className="relative aspect-[2/3] w-full bg-stone-100 overflow-hidden flex items-center justify-center book-cover-shadow">
        {work.cover_url ? (
          <Image
            src={work.cover_url}
            alt={work.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-103 transition-transform duration-300"
          />
        ) : (
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-900 border border-amber-200/60 flex items-center justify-center mb-2 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-serif font-bold text-stone-500 line-clamp-2 px-2">
              {work.title}
            </span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-xs ${
              isFree
                ? 'bg-emerald-800/90 text-emerald-50'
                : 'bg-amber-900/90 text-amber-50'
            }`}
          >
            {priceDisplay}
          </span>

          {work.type === 'serialized_story' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900/80 text-stone-100 backdrop-blur-xs">
              Serial
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-900 transition-colors">
            {work.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-stone-500 font-medium truncate">
            <User className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span className="truncate">{authorName}</span>
          </div>
        </div>

        {/* Footer: Primary Genre & Completion Status */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2 text-[11px] text-stone-400 font-medium">
          <span className="truncate">
            {work.genres && work.genres.length > 0 ? work.genres[0].name : 'Badiiy'}
          </span>
          <span
            className={`flex-shrink-0 ${
              work.completion_status === 'completed'
                ? 'text-emerald-700 font-semibold'
                : 'text-amber-700 font-medium'
            }`}
          >
            {work.completion_status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
          </span>
        </div>
      </div>
    </Link>
  );
}
