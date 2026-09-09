'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Clock, BookOpen, ChevronRight, Lock, Unlock } from 'lucide-react';
import type { RecentChapterItem } from '@/lib/db/queries';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';

interface RecentChaptersSectionProps {
  chapters: RecentChapterItem[];
}

export function RecentChaptersSection({ chapters }: RecentChaptersSectionProps) {
  if (!chapters || chapters.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
            <Sparkles className="w-4 h-4 text-emerald-800" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
              Shu hafta yangi boblar
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Mualliflar tomonidan yaqinda yuklangan va davom ettirilgan yangi boblar
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Chapter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {chapters.map((item) => {
          const authorName = getPublicWorkAuthorName(item.work);
          const chapterUrl = `/asarlar/${item.work.slug}/${item.slug}`;

          return (
            <Link
              key={item.id}
              href={chapterUrl}
              className="chapter-card group flex items-start gap-3 p-3 rounded-2xl bg-white border border-[#EAE5DD] hover:border-emerald-600/40 hover:shadow-lg transition-all duration-300"
            >
              {/* Cover Thumbnail */}
              <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-[#ECE6DD] border border-[#E3DDD3] shrink-0">
                {item.work.cover_url ? (
                  <Image
                    src={item.work.cover_url}
                    alt={item.work.title}
                    fill
                    sizes="56px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-200">
                    <BookOpen className="w-5 h-5 text-stone-400" />
                  </div>
                )}
              </div>

              {/* Chapter & Work Metadata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-emerald-900 transition-colors leading-tight">
                    {item.work.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-emerald-800 truncate mt-0.5">
                    {item.chapter_number}-bob: {item.title}
                  </p>
                  <p className="text-[10.5px] text-stone-500 truncate">
                    {authorName}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500 font-medium pt-1">
                  <span className="flex items-center gap-1 text-stone-500">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>{item.relative_time}</span>
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                      item.is_free
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {item.is_free ? 'Bepul' : 'Pullik bob'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
