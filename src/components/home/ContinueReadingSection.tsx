'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  BookOpen,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';

interface ContinueReadingItem {
  work_id: string;
  work: {
    id: string;
    title: string;
    slug: string;
    cover_url: string | null;
    author?: {
      pen_name: string;
    };
  };
  last_chapter?: {
    id: string;
    chapter_number: number;
    title: string;
    slug: string;
  } | null;
  page_index: number;
  reading_progress: number;
  is_completed: boolean;
  last_read_at: string;
  relative_time: string;
  read_url: string;
}

export function ContinueReadingSection() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ContinueReadingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let isMounted = true;
    async function loadContinueReading() {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/library/continue-reading', { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setItems(data.items || []);
          }
        }
      } catch {
        // ignore background error
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContinueReading();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (authLoading || (!user && !loading)) {
    return null;
  }

  if (loading && items.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-2xl md:col-span-2" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const primaryItem = items[0];
  const secondaryItems = items.slice(1);

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-100/70 text-amber-800">
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-stone-900 tracking-tight">
              Mutolaani davom ettirish
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Oxirgi o‘qilgan joyingizdan bir bosishda davom eting
            </p>
          </div>
        </div>

        <Link
          href="/kutubxona"
          className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Kutubxonam</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Primary Hero Continue Card & Secondary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary #1 Spotlight Card */}
        {primaryItem && (
          <div
            className={`bg-white rounded-3xl border border-[#EAE5DD] p-5 sm:p-6 shadow-xs relative overflow-hidden transition-all hover:border-amber-400/80 group ${
              secondaryItems.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'
            }`}
          >
            {/* Subtle background glow */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-100/50 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 relative z-10">
              {/* Cover */}
              <div className="relative w-20 h-28 sm:w-24 sm:h-34 rounded-2xl bg-stone-100 border border-[#EAE5DD] overflow-hidden shrink-0 shadow-sm group-hover:scale-102 transition-transform">
                {primaryItem.work.cover_url ? (
                  <Image
                    src={primaryItem.work.cover_url}
                    alt={primaryItem.work.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-700 bg-amber-50">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Work Details & Actions */}
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
                <div className="flex items-center justify-center sm:justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Oxirgi o‘qilgan</span>
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">
                    {primaryItem.relative_time}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black font-serif text-stone-900 truncate">
                  {primaryItem.work.title}
                </h3>

                <p className="text-xs text-stone-600 font-medium truncate">
                  Muallif: {primaryItem.work.author?.pen_name || 'Muallif'}
                </p>

                {primaryItem.last_chapter ? (
                  <p className="text-xs text-amber-800 font-bold truncate">
                    {primaryItem.last_chapter.chapter_number}-bob: {primaryItem.last_chapter.title}
                    {primaryItem.page_index > 1 ? ` (${primaryItem.page_index}-sahifa)` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-stone-500 italic">Boshlanishidan</p>
                )}

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-500">Mutolaa jarayoni</span>
                    <span className="text-amber-800">{primaryItem.reading_progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, primaryItem.reading_progress))}%` }}
                    />
                  </div>
                </div>

                {/* Big Resume CTA */}
                <div className="pt-2">
                  <Link
                    href={primaryItem.read_url}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition-all active:scale-98 w-full sm:w-auto"
                  >
                    {primaryItem.is_completed ? (
                      <>
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>Qayta o‘qish</span>
                      </>
                    ) : (
                      <>
                        <span>Mutolaani davom ettirish</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Items List (up to 4 items) */}
        {secondaryItems.length > 0 && (
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {secondaryItems.map((item) => (
              <Link
                key={item.work_id}
                href={item.read_url}
                className="group bg-white p-3.5 rounded-2xl border border-[#EAE5DD] hover:border-amber-400 transition-all flex items-center gap-3 shadow-2xs hover:shadow-xs"
              >
                <div className="relative w-12 h-16 rounded-xl bg-stone-100 border border-[#EAE5DD] overflow-hidden shrink-0 shadow-2xs group-hover:scale-103 transition-transform">
                  {item.work.cover_url ? (
                    <Image
                      src={item.work.cover_url}
                      alt={item.work.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-700 bg-amber-50">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-bold text-stone-900 text-xs truncate group-hover:text-amber-800 transition-colors">
                      {item.work.title}
                    </h4>
                    <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                      {item.relative_time}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 truncate font-medium">
                    {item.work.author?.pen_name || 'Muallif'}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden border border-stone-200/70">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, item.reading_progress))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-stone-600 shrink-0">
                      {item.reading_progress}%
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
