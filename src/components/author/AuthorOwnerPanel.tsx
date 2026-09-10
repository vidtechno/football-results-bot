'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bookmark, BookOpen, Library, LockKeyhole, Wallet } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatUZS } from '@/lib/utils/currency';

type OwnerSummary = {
  progress: any | null;
  bookmarkCount: number;
};

export function AuthorOwnerPanel() {
  const { balance } = useAuth();
  const [summary, setSummary] = useState<OwnerSummary>({ progress: null, bookmarkCount: 0 });

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/library/continue-reading').then((response) =>
        response.ok ? response.json() : { primaryItem: null },
      ),
      fetch('/api/bookmarks?limit=6').then((response) =>
        response.ok ? response.json() : { bookmarks: [] },
      ),
    ])
      .then(([progressData, bookmarkData]) => {
        if (!active) return;
        setSummary({
          progress: progressData?.primaryItem || null,
          bookmarkCount: Array.isArray(bookmarkData?.bookmarks) ? bookmarkData.bookmarks.length : 0,
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const progress = summary.progress;
  const work = progress?.work;
  const chapter = progress?.chapter || progress?.last_chapter;
  const title = progress?.workTitle || work?.title || 'Mutolaani davom ettirish';
  const cover = progress?.coverUrl || work?.cover_url;
  const page = progress?.pageNumber ?? progress?.page_number ?? progress?.page_index ?? 1;
  const percentage =
    progress?.progressPercent ?? progress?.percentage ?? progress?.reading_progress ?? 0;
  const readUrl =
    progress?.resumeUrl ||
    progress?.read_url ||
    (work && chapter
      ? `/asarlar/${work.slug}/${chapter.slug}?page=${page}`
      : '/kutubxona?tab=reading');

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-200/80 bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-950 text-white shadow-lg shadow-emerald-950/10">
      <div className="flex flex-col gap-2 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            Faqat sizga ko‘rinadi
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Shaxsiy kabinet</h2>
          <p className="mt-1 text-xs text-emerald-100/70">
            Mutolaa, kutubxona va hisobingizga tezkor kirish
          </p>
        </div>
        <Link
          href="/sozlamalar"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-bold text-white transition-colors hover:bg-white/15 sm:self-auto"
        >
          Sozlamalar <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.45fr_1fr_1fr]">
        <Link
          href={readUrl}
          className="group flex min-h-[124px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.08] p-4 transition-colors hover:bg-white/[0.13]"
        >
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10 shadow-lg">
            {cover ? (
              <Image src={cover} alt={title} fill sizes="64px" className="object-cover" />
            ) : (
              <BookOpen className="absolute inset-0 m-auto h-6 w-6 text-emerald-200" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
              Mutolaani davom ettirish
            </p>
            <h3 className="mt-1 line-clamp-2 text-sm font-black">{title}</h3>
            {progress ? (
              <>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${Math.max(0, Math.min(100, Number(percentage) || 0))}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-emerald-100/70">
                  {page}-sahifa · {Math.round(Number(percentage) || 0)}%
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-emerald-100/65">Yangi asar tanlash</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-emerald-300 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/kutubxona"
          className="group flex min-h-[124px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.08] p-4 transition-colors hover:bg-white/[0.13]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
            <Library className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black">Mening kutubxonam</span>
            <span className="mt-1 flex items-center justify-between text-[11px] text-emerald-100/65">
              To‘plamlar va xatcho‘plar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </span>
        </Link>

        <div className="grid grid-rows-2 gap-3">
          <Link
            href="/kutubxona?tab=bookmarks"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 transition-colors hover:bg-white/[0.13]"
          >
            <Bookmark className="h-5 w-5 text-amber-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black">Xatcho‘plar</span>
              <span className="block text-[10px] text-emerald-100/65">
                {summary.bookmarkCount} ta so‘nggi belgi
              </span>
            </span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/sozlamalar?tab=finances"
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 transition-colors hover:bg-white/[0.13]"
          >
            <Wallet className="h-5 w-5 text-emerald-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black">Kitobxon balansi</span>
              <span className="block truncate text-[10px] text-emerald-100/65">
                {balance === null ? 'Yuklanmoqda…' : formatUZS(balance)}
              </span>
            </span>
            <LockKeyhole className="h-4 w-4 text-white/35" />
          </Link>
        </div>
      </div>
    </section>
  );
}
