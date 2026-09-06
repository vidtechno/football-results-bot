'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';

export function ContinueReadingSection() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
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

  // For unauthenticated visitors or while determining initial auth state, render nothing
  if (!user || isLoading || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#B45309]" />
          <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
            Mutolaani davom ettirish
          </h2>
        </div>
        <Link
          href="/kutubxona"
          className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
        >
          Barcha saqlanganlar
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const w = item.work;
          const lastCh = item.last_chapter;
          const readUrl = lastCh ? `/asarlar/${w.slug}/${lastCh.slug}` : `/asarlar/${w.slug}`;
          const progress = item.reading_progress || 0;

          return (
            <Link
              key={item.work_id}
              href={readUrl}
              className="group bg-white p-4 rounded-2xl border border-[#EAE5DD] hover:border-[#B45309] transition-all flex items-center gap-3.5 shadow-2xs hover:shadow-xs"
            >
              <div className="relative w-14 h-20 rounded-xl bg-[#FAF8F5] border border-[#EAE5DD] overflow-hidden shrink-0 shadow-2xs">
                {w.cover_url ? (
                  <Image
                    src={w.cover_url}
                    alt={w.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#B45309]">
                    <BookOpen className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-bold text-[#1C1917] text-xs sm:text-sm truncate group-hover:text-[#B45309] transition-colors">
                  {w.title}
                </h4>
                <p className="text-[11px] text-[#78716C] truncate font-medium">
                  {w.author?.pen_name || 'Muallif noma’lum'}
                </p>
                {lastCh && (
                  <p className="text-[11px] text-[#B45309] truncate font-semibold">
                    {lastCh.chapter_number}-bob: {lastCh.title}
                  </p>
                )}

                {/* Progress bar */}
                <div className="pt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#FAF8F5] overflow-hidden border border-[#EAE5DD]">
                    <div
                      className="h-full bg-[#B45309] rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#78716C] shrink-0">
                    {progress}%
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
