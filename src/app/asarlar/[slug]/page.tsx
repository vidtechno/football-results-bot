import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  User,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  Bookmark,
  Share2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getWorkBySlug } from '@/lib/db/queries';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 30;

interface WorkDetailPageProps {
  params: {
    slug: string;
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { work, chapters } = await getWorkBySlug(params.slug);

  if (!work) {
    notFound();
  }

  const isFree = work.access_type === 'free';
  const authorName =
    work.author?.pen_name || work.author?.profile?.display_name || 'Muallif';
  const authorUsername = work.author?.profile?.username;
  const firstChapter = chapters.length > 0 ? chapters[0] : null;

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-semibold truncate">
        <Link href="/" className="hover:text-blue-600">Bosh sahifa</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link href="/asarlar" className="hover:text-blue-600">Asarlar</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 truncate">{work.title}</span>
      </nav>

      {/* Main Work Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-xs">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
          {/* Cover Art */}
          <div className="relative aspect-[3/4] w-full sm:w-56 md:w-64 max-w-[260px] mx-auto md:mx-0 flex-shrink-0 bg-gradient-to-tr from-slate-100 to-blue-50/50 rounded-2xl overflow-hidden border border-slate-200 shadow-md">
            {work.cover_url ? (
              <img
                src={work.cover_url}
                alt={work.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-12 h-12 text-blue-600 mb-2" />
                <span className="text-xs font-bold text-slate-400">{work.title}</span>
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase tracking-wide ${
                    isFree ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {isFree ? 'Bepul mutolaa' : work.access_type === 'paid_full_work' ? `To‘liq asar: ${formatUZS(work.full_work_price)}` : 'Bobma-bob to‘lov'}
                </span>

                <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
                  {work.type === 'serialized_story' ? 'Davomli qissa (Serial)' : 'Kitob'}
                </span>

                <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600">
                  {work.completion_status === 'completed' ? 'Tugallangan' : 'Davom etmoqda'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                {work.title}
              </h1>

              {/* Author link */}
              <div className="flex items-center gap-2 pt-1 text-sm font-semibold text-slate-600">
                <User className="w-4 h-4 text-slate-400" />
                <span>Muallif:</span>
                {authorUsername ? (
                  <Link
                    href={`/mualliflar/${authorUsername}`}
                    className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  <span className="font-bold text-slate-900">{authorName}</span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-2xl whitespace-pre-line">
              {work.description || 'Ushbu asarga hali batafsil tavsif kiritilmagan.'}
            </p>

            {/* Genres */}
            {work.genres && work.genres.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs font-bold text-slate-400">Janrlar:</span>
                {work.genres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/asarlar?genre=${g.slug}`}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="pt-4 flex flex-wrap items-center gap-3">
              {firstChapter ? (
                <Link
                  href={`/asarlar/${work.slug}/${firstChapter.slug}`}
                  className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Mutolaani boshlash</span>
                </Link>
              ) : (
                <div className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-500 font-bold text-xs">
                  Hozircha boblar qo‘shilmagan
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chapters List Table / Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Mundarija ({chapters.length} ta bob)
            </h2>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 text-xs font-semibold">
            Tez orada birinchi boblar e’lon qilinadi.
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {chapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/asarlar/${work.slug}/${ch.slug}`}
                className="group p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-blue-50/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-100 text-slate-700 group-hover:text-blue-700 flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors">
                    {ch.chapter_number}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 truncate transition-colors">
                      {ch.title}
                    </h4>
                    {ch.published_at && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatUzbekDate(ch.published_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {ch.is_free ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Unlock className="w-3 h-3 text-emerald-600" />
                      <span>Bepul</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      <Lock className="w-3 h-3 text-blue-600" />
                      <span>{formatUZS(ch.price)}</span>
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
