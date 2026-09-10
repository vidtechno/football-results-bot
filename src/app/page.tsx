import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  BookOpen,
  TrendingUp,
  ShoppingBag,
  Heart,
  Layers,
  Users,
  ArrowRight,
  ChevronRight,
  PenTool,
  Languages,
} from 'lucide-react';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';
import { createCatalogueClient } from '@/lib/supabase/catalogue';
import { WorkCard } from '@/components/work/WorkCard';
import { HomeHeroCarousel } from '@/components/home/HomeHeroCarousel';
import { HomeDiscoveryTabs } from '@/components/home/HomeDiscoveryTabs';
import type { Work, Genre } from '@/lib/types/platform';

export const revalidate = 60; // Fresh catalogue data revalidated every 60 seconds

export default async function HomePage() {
  const supabase = createCatalogueClient();

  // Fetch all necessary catalogue subsets concurrently
  const [allWorks, genres, authorList] = await Promise.all([
    // One bounded catalogue read replaces six overlapping works queries. The
    // homepage sections are derived in memory from this shared snapshot.
    getPublishedWorks({ sortBy: 'newest', limit: 60 }),
    getActiveGenres(),
    supabase
      .from('author_profiles')
      .select(
        `
        user_id,
        pen_name,
        biography,
        profile:profiles(id, display_name, username, avatar_url)
      `,
      )
      .eq('status', 'approved')
      .limit(6),
  ]);

  const authors = (authorList.data || []) as any[];
  const byNewest = (a: Work, b: Work) =>
    new Date(b.published_at || b.created_at || 0).getTime() -
    new Date(a.published_at || a.created_at || 0).getTime();
  const byUpdated = (a: Work, b: Work) =>
    new Date(b.updated_at || b.published_at || 0).getTime() -
    new Date(a.updated_at || a.published_at || 0).getTime();
  const byPopular = (a: Work, b: Work) =>
    Number(b.view_count || 0) - Number(a.view_count || 0) ||
    Number(b.average_rating || 0) - Number(a.average_rating || 0);

  const originalWorks = allWorks.filter((work) => !work.is_translation);
  const recentUpdatedWorks = [...originalWorks].sort(byUpdated).slice(0, 10);
  const featuredWorks = originalWorks
    .filter((work) => work.is_featured)
    .sort(byUpdated)
    .slice(0, 6);
  const storyWorks = originalWorks
    .filter((work) => work.type === 'serialized_story')
    .sort(byNewest)
    .slice(0, 8);
  const popularWorks = [...originalWorks].sort(byPopular).slice(0, 10);
  const mostReadWorks = [...allWorks]
    .filter((work) => Number(work.unique_readers_count || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.unique_readers_count || 0) -
        Number(a.unique_readers_count || 0),
    )
    .slice(0, 6);
  const bestsellerWorks = allWorks
    .filter((work) => work.access_type === 'paid_full_work' && Number(work.sales_count || 0) > 0)
    .sort((a, b) => Number(b.sales_count || 0) - Number(a.sales_count || 0))
    .slice(0, 6);
  const readerLovedWorks = allWorks
    .filter((work) => Number(work.rating_count || 0) > 0)
    .sort(
      (a, b) =>
        Number(b.average_rating || 0) - Number(a.average_rating || 0) ||
        Number(b.rating_count || 0) - Number(a.rating_count || 0),
    )
    .slice(0, 6);
  const quickStoryWorks = allWorks
    .filter((work) => work.type === 'serialized_story' && Number(work.total_words || 0) > 0 && Number(work.total_words) <= 3500)
    .sort(byNewest)
    .slice(0, 6);
  const translatedWorks = allWorks
    .filter((work) => work.is_translation)
    .sort(byNewest)
    .slice(0, 6);
  const discoveryNewWorks = [...allWorks].sort(byNewest).slice(0, 10);

  // Hero carousel candidates
  const heroRecent =
    recentUpdatedWorks.find((w) => w.type === 'serialized_story') || recentUpdatedWorks[0] || null;
  const heroEditor = featuredWorks[0] || popularWorks[0] || null;
  const heroPopular = popularWorks[0] || recentUpdatedWorks[0] || null;
  const section1Works = recentUpdatedWorks.slice(0, 6);
  const section3Works = bestsellerWorks;
  const section4Works = quickStoryWorks;
  const section5Works = mostReadWorks;
  const section8Works = readerLovedWorks;

  return (
    <div className="home-page relative space-y-10 sm:space-y-14">
      <div className="home-ambient home-ambient-one" aria-hidden="true" />
      <div className="home-ambient home-ambient-two" aria-hidden="true" />
      {/* Semantic H1 for platform primary hierarchy & SEO accessibility */}
      <h1 className="sr-only">Manbora — o‘zbek kitoblari va asarlar platformasi</h1>

      {/* Structured Data (Schema.org WebSite) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Manbora',
            url: 'https://manbora.uz',
            inLanguage: 'uz',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://manbora.uz/qidiruv?q={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />

      {/* 1. Dynamic Hero Carousel (up to 4 slides with Continue Reading, Recently Updated, Editor's Choice, Author CTA) */}
      <HomeHeroCarousel
        recentlyUpdatedWork={heroRecent}
        editorChoiceWork={heroEditor}
        popularWork={heroPopular}
      />

      {/* 2. Horizontal Discovery Tabs (Yangi, Siz uchun, Ommabop, Kuzatayotganlarim) */}
      <HomeDiscoveryTabs initialWorks={discoveryNewWorks} popularWorks={popularWorks} />

      {/* Curated translations uploaded by the Manbora administration */}
      {translatedWorks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-indigo-100 text-indigo-900">
                <Languages className="w-4 h-4 text-indigo-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Dunyo adabiyoti o‘zbek tilida
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Manbora tahririyati tomonidan saralangan tarjima asarlar
                </p>
              </div>
            </div>
            <Link
              href="/tarjima-asarlar"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {translatedWorks.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 1: Yaqinda yangilangan (Recently Updated Works) */}
      {section1Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <Clock className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Yaqinda yangilangan
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Mualliflar tomonidan so‘nggi kunlarda tahrirlangan va yangilangan asarlar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?collection=yaqinda_yangilangan"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {section1Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* Bestseller works */}
      {section3Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                <ShoppingBag className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Bestsellerlar
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Kitobxonlar eng ko‘p xarid qilgan pullik asarlar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?collection=bestseller"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {section3Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* Quick stories */}
      {section4Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <BookOpen className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Tez o‘qiladigan hikoyalar
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Bir o‘tirishda mutolaa qilish mumkin bo‘lgan 3 500 so‘zgacha hikoyalar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?collection=15_daqiqa&type=serialized_story"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {section4Works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                context="catalogue"
                showReadingTime={Boolean(work.total_words)}
                readingTimeMinutes={
                  work.total_words ? Math.max(1, Math.ceil(work.total_words / 200)) : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Most read */}
      {section5Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <TrendingUp className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Eng ko‘p o‘qilgan
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Eng ko‘p noyob kitobxon mutolaa qilgan asarlar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?collection=eng_kop_oqilgan"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {section5Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: Janrlar bo‘yicha (Browse by Genre) */}
      {genres.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <Layers className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Janrlar bo‘yicha
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Qiziqishingizga mos mavzu va janrdagi asarlarni tanlang
                </p>
              </div>
            </div>
            <Link
              href="/janrlar"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barcha janrlar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {genres.map((g: Genre) => (
              <Link
                key={g.id}
                href={`/janrlar/${g.slug}`}
                className="px-4 py-2 rounded-2xl bg-white border border-[#EAE5DD] hover:border-emerald-600/50 hover:bg-emerald-50/50 text-stone-700 hover:text-emerald-950 text-xs font-bold transition-all shadow-2xs"
              >
                {g.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 7: Yangi mualliflar (Featured / New Authors) */}
      {authors.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <Users className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Yangi mualliflar
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Platformamizda ijod qilayotgan iqtidorli mualliflar va ijodkorlar
                </p>
              </div>
            </div>
            <Link
              href="/mualliflar"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barcha mualliflar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {authors.map((authorItem) => {
              const prof = authorItem.profile;
              const authorUrl = prof?.username
                ? `/mualliflar/${prof.username}`
                : `/mualliflar/${authorItem.user_id}`;

              return (
                <Link
                  key={authorItem.user_id}
                  href={authorUrl}
                  className="group bg-white rounded-2xl border border-[#EAE5DD] p-4 text-center hover:border-emerald-600/50 transition-all flex flex-col items-center space-y-2 shadow-2xs hover:shadow-xs"
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-600 text-white flex items-center justify-center text-lg font-black shadow-xs overflow-hidden shrink-0">
                    {prof?.avatar_url ? (
                      <Image
                        src={prof.avatar_url}
                        alt={authorItem.pen_name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <span>{authorItem.pen_name.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 w-full">
                    <h4 className="font-bold text-stone-900 text-xs truncate group-hover:text-emerald-900 transition-colors">
                      {authorItem.pen_name}
                    </h4>
                    {prof?.username && (
                      <p className="text-[10px] text-stone-400 truncate">@{prof.username}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Reader favourites */}
      {section8Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <Heart className="w-4 h-4 text-rose-700" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Kitobxonlar sevgan
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Kitobxonlar yuqori baholagan va taqriz qoldirgan asarlar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?collection=kitobxonlar_sevgan"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {section8Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 9: Final Author CTA Card */}
      <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-900 via-stone-900 to-[#1C1917] text-white relative overflow-hidden shadow-md">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
            <PenTool className="w-3.5 h-3.5" />
            <span>Manbora Mualliflik Maydoni</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            O‘z asaringizni nashr qiling va daromad toping
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
            Manbora — mustaqil mualliflar, hikoyanavislar va ijodkorlar uchun zamonaviy raqamli
            noshirlik maydoni. Asaringizni o‘quvchilarga yetkazing, obunachilar to‘plang va har bir
            sotuvdan shaffof daromad oling.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/muallif-boling"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all duration-150 shadow-md group"
            >
              <span>Muallif bo‘lish</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/asarlar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm border border-stone-700 transition-colors"
            >
              <span>Asarlar bilan tanishish</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
