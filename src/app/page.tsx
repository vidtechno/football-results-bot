import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  Sparkles,
  Star,
  BookOpen,
  TrendingUp,
  Layers,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  PenTool,
  Languages,
} from 'lucide-react';
import { getPublishedWorks, getActiveGenres, getRecentChapters, getPaginatedCatalogue } from '@/lib/db/queries';
import { createServerClient } from '@/lib/supabase/server';
import { WorkCard } from '@/components/work/WorkCard';
import { HomeHeroCarousel } from '@/components/home/HomeHeroCarousel';
import { HomeDiscoveryTabs } from '@/components/home/HomeDiscoveryTabs';
import { RecentChaptersSection } from '@/components/home/RecentChaptersSection';
import type { Work, Genre } from '@/lib/types/platform';

export const revalidate = 60; // Fresh catalogue data revalidated every 60 seconds

export default async function HomePage() {
  const supabase = createServerClient();

  // Fetch all necessary catalogue subsets concurrently
  const [
    recentUpdatedWorks,
    recentChapters,
    featuredWorks,
    storyWorks,
    popularWorks,
    freeWorks,
    genres,
    authorList,
    translatedCatalogue,
  ] = await Promise.all([
    getPublishedWorks({ sortBy: 'updated', limit: 10 }),
    getRecentChapters(8),
    getPublishedWorks({ isFeatured: true, limit: 6 }),
    getPublishedWorks({ type: 'serialized_story', limit: 8 }),
    getPublishedWorks({ sortBy: 'popular', limit: 10 }),
    getPublishedWorks({ accessType: 'free', limit: 8 }),
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
    getPaginatedCatalogue({
      page: 1,
      pageSize: 5,
      isTranslation: true,
      sortBy: 'newest',
    }),
  ]);

  const authors = (authorList.data || []) as any[];

  // Hero carousel candidates
  const heroRecent =
    recentUpdatedWorks.find((w) => w.type === 'serialized_story') ||
    recentUpdatedWorks[0] ||
    null;
  const heroEditor = featuredWorks[0] || popularWorks[0] || null;
  const heroPopular = popularWorks[0] || recentUpdatedWorks[0] || null;

  // Deduplication system across sections to prevent repeating identical works in small catalogues
  const shownWorkIds = new Set<string>();

  // Give translated works their own prominent section and avoid repeating them below.
  const translatedWorks = translatedCatalogue.works;
  translatedWorks.forEach((work) => shownWorkIds.add(work.id));

  const getDeduplicatedSlice = (candidateWorks: Work[], maxCount = 5): Work[] => {
    // Pick works that have not been displayed yet
    const unseen = candidateWorks.filter((w) => !shownWorkIds.has(w.id));
    if (unseen.length > 0) {
      const selected = unseen.slice(0, maxCount);
      selected.forEach((w) => shownWorkIds.add(w.id));
      return selected;
    }
    // Strict deduplication: never repeat works across sections; return empty so empty sections are hidden
    return [];
  };

  // 1. Yaqinda yangilangan works
  const section1Works = getDeduplicatedSlice(recentUpdatedWorks, 5);

  // 3. Muharrir tanlovi works (fallback to popular if no featured flag)
  const editorCandidates = featuredWorks.length > 0 ? featuredWorks : popularWorks;
  const section3Works = getDeduplicatedSlice(editorCandidates, 5);

  // 4. 15 daqiqada o‘qiladigan hikoyalar:
  // Rule: total published word count / 200 wpm <= 15 mins (<= 3000 words)
  // Prefer completed short stories, then serialized stories
  const shortStoriesCandidates = (storyWorks || []).filter((w) => {
    const words = w.total_words || 0;
    if (words > 0) {
      return Math.ceil(words / 200) <= 15;
    }
    return w.type === 'serialized_story';
  }).sort((a, b) => {
    if (a.completion_status === 'completed' && b.completion_status !== 'completed') return -1;
    if (b.completion_status === 'completed' && a.completion_status !== 'completed') return 1;
    return (a.total_words || 0) - (b.total_words || 0);
  });
  const section4Works = getDeduplicatedSlice(shortStoriesCandidates, 5);

  // 5. Eng ko‘p muhokama qilinayotgan
  const section5Works = getDeduplicatedSlice(popularWorks, 5);

  // 8. Bepul o‘qish
  const section8Works = getDeduplicatedSlice(freeWorks, 5);

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* 1. Dynamic Hero Carousel (up to 4 slides with Continue Reading, Recently Updated, Editor's Choice, Author CTA) */}
      <HomeHeroCarousel
        recentlyUpdatedWork={heroRecent}
        editorChoiceWork={heroEditor}
        popularWork={heroPopular}
      />

      {/* 2. Horizontal Discovery Tabs (Yangi, Siz uchun, Ommabop, Kuzatayotganlarim) */}
      <HomeDiscoveryTabs
        initialWorks={recentUpdatedWorks}
        popularWorks={popularWorks}
      />

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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
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
              href="/asarlar?sort=newest"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {section1Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Shu hafta yangi boblar (Distinct new chapters feed) */}
      {recentChapters.length > 0 && (
        <RecentChaptersSection chapters={recentChapters} />
      )}

      {/* SECTION 3: Muharrir tanlovi (Editor's Choice) */}
      {section3Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                <Star className="w-4 h-4 text-amber-700 fill-amber-700" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Muharrir tanlovi
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Adabiy qimmati va o‘quvchilar e’tirofiga sazovor bo‘lgan sara namunalar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {section3Works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4: 15 daqiqada o‘qiladigan hikoyalar (Short Serial Stories) */}
      {section4Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <BookOpen className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  15 daqiqada o‘qiladigan hikoyalar
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Yo‘lda yoki qisqa tanaffusda o‘qish uchun mos ixcham hikoyalar
                </p>
              </div>
            </div>
            <Link
              href="/hikoyalar"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {section4Works.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                context="catalogue"
                showReadingTime={true}
                readingTimeMinutes={Math.max(1, Math.ceil((work.total_words || 800) / 200))}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: Eng ko‘p muhokama qilinayotgan (Most Discussed Works) */}
      {section5Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <TrendingUp className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Eng ko‘p muhokama qilinayotgan
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Kitobxonlar faol fikr bildirayotgan va yuqori baholangan asarlar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?sort=popular"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
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

      {/* SECTION 8: Bepul o‘qish (Free Reading Works) */}
      {section8Works.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-800" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] tracking-tight">
                  Bepul o‘qish
                </h2>
                <p className="text-xs text-stone-500 font-medium">
                  Barcha boblari to‘liq bepul o‘qiladigan kitoblar va hikoyalar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?access=free"
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Barchasi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
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
            Manbora — mustaqil mualliflar, hikoyanavislar va ijodkorlar uchun zamonaviy raqamli noshirlik maydoni. Asaringizni o‘quvchilarga yetkazing, obunachilar to‘plang va har bir sotuvdan shaffof daromad oling.
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
