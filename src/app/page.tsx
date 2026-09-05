import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Compass,
  Search,
  ArrowRight,
  Bookmark,
  TrendingUp,
  Sparkles,
  Users,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';
import { getCurrentProfile, createServerClient } from '@/lib/supabase/server';
import { WorkCard } from '@/components/work/WorkCard';
import type { Work, Genre } from '@/lib/types/platform';

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const supabase = createServerClient();

  const [allWorks, freeWorks, serializedStories, genres, authorList] = await Promise.all([
    getPublishedWorks({ limit: 12 }),
    getPublishedWorks({ accessType: 'free', limit: 6 }),
    getPublishedWorks({ type: 'serialized_story', limit: 6 }),
    getActiveGenres(),
    supabase
      .from('author_profiles')
      .select(`
        user_id,
        pen_name,
        biography,
        profile:profiles(id, display_name, username, avatar_url)
      `)
      .eq('status', 'approved')
      .limit(6),
  ]);

  // If user signed in, load active reading items
  let continueReadingItems: any[] = [];
  if (profile) {
    try {
      const { data: libData } = await supabase
        .from('library_items')
        .select(`
          work_id,
          saved_state,
          reading_progress,
          updated_at,
          work:works (
            id, title, slug, cover_url, access_type, type,
            author:author_profiles (pen_name)
          ),
          last_chapter:chapters!last_read_chapter_id (
            id, chapter_number, title, slug
          )
        `)
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(3);

      continueReadingItems = (libData || []).filter((item: any) => item.work);
    } catch {
      // ignore
    }
  }

  const popularWorks = allWorks.slice(0, 6);
  const newArrivals = allWorks.slice(2, 8);
  const authors = (authorList.data || []) as any[];

  return (
    <div className="space-y-10 sm:space-y-14 pb-16">
      {/* 1. Compact Discovery Hero & Filter Pills */}
      <section className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
            <span>O‘zbek adabiyoti va hikoyalar maydoni</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1C1917] tracking-tight leading-tight">
            Sara asarlar, yangi hikoyalar va elektron kitoblar mutolaasi
          </h1>

          <p className="text-xs sm:text-sm text-[#78716C] leading-relaxed font-medium max-w-xl">
            Manbora — mustaqil mualliflar bilan kitobxonlarni birlashtiruvchi zamonaviy adabiy platforma. Bobma-bob serial asarlar va to‘liq kitoblarni onlayn o‘qing.
          </p>

          {/* Quick Search Bar */}
          <form method="GET" action="/qidiruv" className="pt-2 flex items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Asar nomi, muallif yoki kalit so‘z..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DD] focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#FEF3C7] outline-hidden text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
            >
              Qidirish
            </button>
          </form>

          {/* Discovery Filter Pills */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/asarlar"
              className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors shadow-2xs"
            >
              Barcha asarlar
            </Link>
            <Link
              href="/kitoblar"
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 font-bold hover:bg-amber-100 transition-colors"
            >
              Elektron kitoblar
            </Link>
            <Link
              href="/hikoyalar"
              className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 font-bold hover:bg-amber-100 transition-colors"
            >
              Serial hikoyalar
            </Link>
            <Link
              href="/asarlar?access=free"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-bold hover:bg-emerald-100 transition-colors"
            >
              Bepul asarlar
            </Link>
            <Link
              href="/janrlar"
              className="px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold transition-colors"
            >
              Barcha janrlar
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Mutolaani davom ettirish (Shown ONLY when relevant) */}
      {continueReadingItems.length > 0 && (
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
            {continueReadingItems.map((item) => {
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
                    <p className="text-[11px] text-[#78716C] truncate">
                      {w.author?.pen_name || 'Muallif'}
                    </p>
                    {lastCh && (
                      <p className="text-[10px] text-[#A8A29E] truncate">
                        {lastCh.chapter_number}-bob: {lastCh.title}
                      </p>
                    )}
                    <div className="w-full bg-[#F5F2EC] h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-[#B45309] h-full rounded-full transition-all"
                        style={{ width: `${Math.max(5, progress)}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Ommabop asarlar (Popular Works) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#B45309]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Ommabop asarlar
            </h2>
          </div>
          <Link
            href="/asarlar?sort=popular"
            className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
          >
            Barchasini ko‘rish
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {popularWorks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-8 text-center text-xs text-[#78716C]">
            Hozircha ommabop asarlar mavjud emas.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {popularWorks.map((work: Work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </section>

      {/* 4. Yangi nashrlar (New Works) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#B45309]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Yangi nashrlar
            </h2>
          </div>
          <Link
            href="/asarlar?sort=newest"
            className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
          >
            Barchasini ko‘rish
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-8 text-center text-xs text-[#78716C]">
            Hozircha yangi asarlar mavjud emas.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {newArrivals.map((work: Work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </section>

      {/* 5. Davomli Serial Hikoyalar */}
      {serializedStories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B45309]" />
              <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                Bepul sara asarlar
              </h2>
            </div>
            <Link
              href="/hikoyalar"
              className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
            >
              Barcha hikoyalar
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {serializedStories.map((work: Work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* 6. Bepul mutolaa (Free Reading) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#B45309]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              To‘liq kitoblar
            </h2>
          </div>
          <Link
            href="/asarlar?access=free"
            className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
          >
            Barcha bepul asarlar
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {freeWorks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-8 text-center text-xs text-[#78716C]">
            Hozircha bepul asarlar mavjud emas.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {freeWorks.map((work: Work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </section>

      {/* 7. Janrlar bo‘yicha tanlang (Direct links to /janrlar/[slug]) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#B45309]" />
            <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
              Janrlar bo‘yicha kashf qiling
            </h2>
          </div>
          <Link
            href="/janrlar"
            className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
          >
            Barcha janrlar
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {genres.map((g: Genre) => (
            <Link
              key={g.id}
              href={`/janrlar/${g.slug}`}
              className="px-3.5 py-2 rounded-2xl bg-white border border-[#EAE5DD] hover:border-amber-400 hover:bg-amber-50/50 text-[#57534E] hover:text-amber-900 text-xs font-bold transition-all shadow-2xs"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </section>

      {/* 8. Tavsiya etilgan mualliflar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B45309]" />
            <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1C1917] tracking-tight">
              Tavsiya etilgan mualliflar
            </h2>
          </div>
          <Link
            href="/mualliflar"
            className="text-xs font-bold text-[#B45309] hover:underline flex items-center gap-1"
          >
            Barcha mualliflar
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {authors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-8 text-center text-xs text-[#78716C]">
            Hozircha mualliflar ro‘yxati bo‘sh.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {authors.map((author) => {
              const prof = author.profile;
              const authorUrl = prof?.username ? `/mualliflar/${prof.username}` : `/mualliflar/${author.user_id}`;

              return (
                <Link
                  key={author.user_id}
                  href={authorUrl}
                  className="group bg-white rounded-2xl border border-[#EAE5DD] p-4 text-center hover:border-[#B45309] transition-all flex flex-col items-center space-y-2 shadow-2xs hover:shadow-xs"
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#B45309] to-[#D97706] text-white flex items-center justify-center text-lg font-bold shadow-xs overflow-hidden shrink-0">
                    {prof?.avatar_url ? (
                      <Image
                        src={prof.avatar_url}
                        alt={author.pen_name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span>{author.pen_name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <h4 className="font-bold text-[#1C1917] text-xs truncate group-hover:text-[#B45309] transition-colors">
                      {author.pen_name}
                    </h4>
                    {prof?.username && (
                      <p className="text-[10px] text-[#A8A29E] truncate">@{prof.username}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
