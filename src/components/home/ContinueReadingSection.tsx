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
import type { RecentReadingProgressDTO } from '@/lib/services/progress';

export function ContinueReadingSection() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RecentReadingProgressDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let isMounted = true;
    async function loadContinueReading() {
      try {
        setLoading(true);
        setError(null);
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
        } else {
          throw new Error('Mutolaa ma‘lumotlarini yuklashda xatolik');
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Xatolik yuz berdi');
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

  if (error) {
    return (
      <section className="space-y-4">
        <div className="p-6 bg-white rounded-3xl border border-red-200 text-center space-y-2">
          <p className="text-xs text-red-600 font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => {
              if (user) {
                setLoading(true);
                setError(null);
                fetch('/api/library/continue-reading')
                  .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Xatolik'))))
                  .then((d) => setItems(d.items || []))
                  .catch((e) => setError(e.message))
                  .finally(() => setLoading(false));
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
          >
            Qayta urinish
          </button>
        </div>
      </section>
    );
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
  const secondaryItems = items.slice(1, 5);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
            <Clock className="w-4 h-4 text-amber-800" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
              Mutolaani davom ettirish
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Oxirgi o‘qigan asarlaringiz va qolgan sahifangiz
            </p>
          </div>
        </div>

        <Link
          href="/kutubxona?tab=reading"
          className="text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Barchasi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primary Featured Item */}
        {primaryItem && (
          <div className={`${secondaryItems.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAE5DD] shadow-xs hover:border-amber-400 transition-colors flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Cover */}
              <div className="relative w-28 sm:w-32 aspect-[3/4] rounded-2xl overflow-hidden shadow-sm shrink-0 border border-[#EAE5DD] bg-stone-100">
                {primaryItem.coverUrl ? (
                  <Image
                    src={primaryItem.coverUrl}
                    alt={primaryItem.workTitle}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-700 bg-amber-50">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
                <div className="flex items-center justify-center sm:justify-between gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Oxirgi o‘qilgan</span>
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium">
                    {primaryItem.lastReadLabel}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-black font-sans text-stone-900 truncate">
                  {primaryItem.workTitle}
                </h3>

                <p className="text-xs text-stone-600 font-medium truncate">
                  Muallif: {primaryItem.authorName}
                </p>

                {primaryItem.chapterTitle ? (
                  <p className="text-xs text-amber-800 font-bold truncate">
                    {primaryItem.chapterNumber}-bob: {primaryItem.chapterTitle}
                    {` (${primaryItem.pageNumber}-sahifa)`}
                  </p>
                ) : (
                  <p className="text-xs text-stone-500 italic">Boshlanishidan</p>
                )}

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-stone-500">Mutolaa jarayoni</span>
                    <span className="text-amber-800">{primaryItem.progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden border border-stone-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, primaryItem.progressPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Big Resume CTA */}
                <div className="pt-2">
                  <Link
                    href={primaryItem.resumeUrl}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition-all active:scale-98 w-full sm:w-auto"
                  >
                    {primaryItem.isCompleted ? (
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
                key={item.workId}
                href={item.resumeUrl}
                className="group bg-white p-3.5 rounded-2xl border border-[#EAE5DD] hover:border-amber-400 transition-all flex items-center gap-3 shadow-2xs hover:shadow-xs"
              >
                <div className="relative w-12 h-16 rounded-xl bg-stone-100 border border-[#EAE5DD] overflow-hidden shrink-0 shadow-2xs group-hover:scale-103 transition-transform">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt={item.workTitle}
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
                      {item.workTitle}
                    </h4>
                    <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                      {item.lastReadLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-500 truncate font-medium">
                    {item.authorName}
                  </p>

                  <div className="flex items-center gap-2 pt-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-stone-100 overflow-hidden border border-stone-200/70">
                      <div
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-stone-600 shrink-0">
                      {item.progressPercent}%
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
