'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ChevronRight, BookOpen, Star, Flame } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Work } from '@/lib/types/platform';

interface RecommendedWork extends Work {
  recommendation_reason?: string;
}

export function PersonalizedRecommendations() {
  const { user } = useAuth();
  const [items, setItems] = useState<RecommendedWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadRecommendations() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/recommendations', { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setItems(data.recommendations || []);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRecommendations();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading && items.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-100/80 text-amber-900 shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-700" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-serif text-stone-900 tracking-tight">
              Siz uchun tavsiyalar
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Did va mutolaa tarixingiz asosida tanlab olingan asarlar
            </p>
          </div>
        </div>

        <Link
          href="/asarlar"
          className="text-xs font-bold text-amber-800 hover:text-amber-900 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Barchasi</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Grid of Recommendation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {items.map((w) => {
          const authorName = w.author?.pen_name || 'Muallif';
          const genreName = (w.genres && w.genres.length > 0)
            ? w.genres[0].name
            : (w as any).work_genres?.[0]?.genre?.name || null;

          return (
            <Link
              key={w.id}
              href={`/asarlar/${w.slug}`}
              className="group flex flex-col bg-white rounded-2xl border border-[#EAE5DD] hover:border-amber-400/80 p-2 sm:p-2.5 transition-all shadow-2xs hover:shadow-xs overflow-hidden"
            >
              {/* Cover with recommendation badge */}
              <div className="relative aspect-2/3 w-full rounded-xl bg-stone-100 overflow-hidden border border-stone-200/80 mb-2.5 group-hover:scale-102 transition-transform">
                {w.cover_url ? (
                  <Image
                    src={w.cover_url}
                    alt={w.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 150px, (max-width: 1024px) 180px, 200px"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-amber-700 bg-amber-50 p-2 text-center">
                    <BookOpen className="w-8 h-8 mb-1 opacity-70" />
                    <span className="text-[10px] font-bold line-clamp-2 leading-tight">
                      {w.title}
                    </span>
                  </div>
                )}

                {/* Status / Access badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {w.access_type === 'free' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white font-black text-[9px] uppercase tracking-wide backdrop-blur-xs">
                      Bepul
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-600/90 text-white font-black text-[9px] uppercase tracking-wide backdrop-blur-xs">
                      Pullik
                    </span>
                  )}
                </div>

                {/* Rating badge */}
                {typeof w.average_rating === 'number' && w.average_rating > 0 && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-stone-900/80 text-amber-300 font-bold text-[10px] flex items-center gap-0.5 backdrop-blur-xs">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>{w.average_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Work Info */}
              <div className="flex-1 flex flex-col justify-between space-y-1">
                <div>
                  {/* Recommendation Rationale Pill */}
                  {w.recommendation_reason && (
                    <span className="inline-block text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md mb-1 line-clamp-1">
                      {w.recommendation_reason}
                    </span>
                  )}

                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-2 group-hover:text-amber-800 transition-colors leading-snug">
                    {w.title}
                  </h3>

                  <p className="text-[11px] text-stone-500 truncate font-medium pt-0.5">
                    {authorName}
                  </p>
                </div>

                {/* Genre footer */}
                {genreName && (
                  <span className="text-[10px] text-stone-400 font-medium truncate block pt-1">
                    {genreName}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
