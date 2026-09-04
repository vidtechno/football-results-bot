import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Compass,
  PenTool,
  ArrowRight,
  Sparkles,
  Bookmark,
  TrendingUp,
  Award,
} from 'lucide-react';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';
import { WorkCard } from '@/components/works/WorkCard';
import { WorkGrid } from '@/components/works/WorkGrid';

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
  const [allWorks, genres] = await Promise.all([
    getPublishedWorks({ limit: 12 }),
    getActiveGenres(),
  ]);

  const featuredWorks = allWorks.slice(0, 4);
  const serializedStories = allWorks.filter((w) => w.type === 'serialized_story').slice(0, 4);
  const latestBooks = allWorks.filter((w) => w.type === 'book').slice(0, 4);

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 text-white p-7 sm:p-12 lg:p-16 shadow-xl shadow-blue-600/15">
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>O‘zbek kitob va hikoyalar platformasi</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
            Yangi asarlar, sevimli mualliflar va erkin mutolaa
          </h1>

          <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
            Manborada sara kitoblar, yangi boblari muntazam chiqib turadigan serialized qissalar va mustaqil mualliflarning ijod namunalarini o‘qing.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3.5">
            <Link
              href="/asarlar"
              className="px-6 py-3.5 rounded-2xl bg-white text-blue-700 hover:bg-blue-50 font-black text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Mutolaani boshlash</span>
            </Link>

            <Link
              href="/muallif"
              className="px-6 py-3.5 rounded-2xl bg-blue-800/80 hover:bg-blue-800 text-white border border-blue-400/40 font-extrabold text-xs sm:text-sm active:scale-95 transition-all flex items-center gap-2 backdrop-blur-xs"
            >
              <PenTool className="w-4 h-4" />
              <span>Asar e’lon qilish</span>
            </Link>
          </div>
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Genres Carousel/Grid */}
      {genres.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Janrlar bo‘yicha
              </h2>
            </div>
            <Link
              href="/asarlar"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Barchasi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/asarlar?genre=${genre.slug}`}
                className="flex-shrink-0 px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 hover:text-blue-600 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs whitespace-nowrap"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Works */}
      {featuredWorks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Tavsiya etilgan asarlar
              </h2>
            </div>
            <Link
              href="/asarlar"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Barcha asarlar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <WorkGrid works={featuredWorks} />
        </section>
      )}

      {/* Serialized Stories Section */}
      {serializedStories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Davomli asarlar (Seriallar)
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Har haftada yangi boblar qo‘shilib boradigan qiziqarli hikoyalar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?type=serialized_story"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0"
            >
              <span>Ko‘rish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <WorkGrid works={serializedStories} />
        </section>
      )}

      {/* Author Callout Banner */}
      <section className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/20">
            <Award className="w-3.5 h-3.5" />
            <span>Mualliflar uchun</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            O‘z kitob va hikoyalaringizni Manborada nashr qiling
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Kitobxonlar auditoriyasini to‘plang, asaringizni bepul yoki pullik tarzda taqdim eting va har bir xariddan 80% sof daromad oling.
          </p>
        </div>

        <Link
          href="/muallif"
          className="px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex-shrink-0 flex items-center gap-2"
        >
          <span>Muallif bo‘lish</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
