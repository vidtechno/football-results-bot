import React from 'react';
import Link from 'next/link';
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
      : "Bobma-bob to'lov";

  const authorName =
    work.author?.pen_name || work.author?.profile?.display_name || 'Noma‘lum muallif';

  return (
    <Link
      href={`/asarlar/${work.slug}`}
      className="app-card group flex flex-col overflow-hidden bg-white hover:shadow-lg transition-all duration-200 border border-slate-200/80 rounded-2xl"
    >
      {/* Cover Aspect Ratio 3:4 */}
      <div className="relative aspect-[3/4] w-full bg-gradient-to-tr from-slate-100 to-blue-50/50 overflow-hidden flex items-center justify-center">
        {work.cover_url ? (
          <img
            src={work.cover_url}
            alt={work.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="p-4 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 line-clamp-2 px-2">
              {work.title}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide shadow-xs ${
              isFree
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {priceDisplay}
          </span>

          {work.type === 'serialized_story' && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
              Serial
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
            {work.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium truncate">
            <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{authorName}</span>
          </div>
        </div>

        {/* Footer info: Genres & Completion status */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
          <span className="truncate">
            {work.genres && work.genres.length > 0
              ? work.genres[0].name
              : 'Umumiy'}
          </span>
          <span
            className={`flex-shrink-0 ${
              work.completion_status === 'completed'
                ? 'text-emerald-600 font-bold'
                : 'text-amber-600 font-semibold'
            }`}
          >
            {work.completion_status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
          </span>
        </div>
      </div>
    </Link>
  );
}
