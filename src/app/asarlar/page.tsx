import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Search, Compass, BookOpen, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { getPaginatedCatalogue, getActiveGenres } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { CataloguePagination } from '@/components/catalogue/CataloguePagination';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Barcha asarlar katalogi',
  description:
    'O‘zbek adabiyotining sara kitoblari, davomli hikoyalari va qissalari katalogi. Bepul va pullik elektron asarlar mutolaasi.',
  alternates: {
    canonical: 'https://manbora.uz/asarlar',
  },
  openGraph: {
    type: 'website',
    title: 'O‘zbek kitoblari va hikoyalari katalogi',
    description:
      'O‘zbek adabiyotining sara kitoblari, davomli hikoyalari va qissalarini Manbora’da kashf eting.',
    url: '/asarlar',
    siteName: 'Manbora',
    locale: 'uz_UZ',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O‘zbek kitoblari va hikoyalari katalogi',
    description: 'Manbora’dagi sara o‘zbek kitoblari, hikoyalari va qissalari.',
    images: ['/opengraph-image'],
  },
};

interface AsarlarPageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    type?: 'book' | 'serialized_story';
    access?: 'free' | 'paid_full_work' | 'paid_by_chapter';
    status?: 'ongoing' | 'completed';
    sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
    collection?: string;
    page?: string;
  }>;
}

export default async function AsarlarPage({ searchParams: searchParamsPromise }: AsarlarPageProps) {
  const searchParams = await searchParamsPromise;
  const query = searchParams.q || '';
  const genreSlug = searchParams.genre;
  const typeFilter = searchParams.type;
  const accessFilter = searchParams.access;
  const statusFilter = searchParams.status;
  const collectionFilter = searchParams.collection;
  const sortBy = searchParams.sort || 'newest';
  const currentPage = Math.max(1, Number(searchParams.page) || 1);

  const [catalogue, genres] = await Promise.all([
    getPaginatedCatalogue({
      page: currentPage,
      pageSize: 20,
      query: query || undefined,
      genreSlug: genreSlug || undefined,
      type: typeFilter || undefined,
      accessType: accessFilter || undefined,
      completionStatus: statusFilter || undefined,
      sortBy: sortBy,
      collection: collectionFilter || undefined,
    }),
    getActiveGenres(),
  ]);

  const { works, totalCount, totalPages } = catalogue;

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const state: Record<string, string | undefined> = {
      type: typeFilter,
      genre: genreSlug,
      access: accessFilter,
      sort: sortBy !== 'newest' ? sortBy : undefined,
      collection: collectionFilter,
      q: query || undefined,
      ...overrides,
    };
    for (const [key, val] of Object.entries(state)) {
      if (val !== undefined && val !== '') {
        params.set(key, val);
      }
    }
    const str = params.toString();
    return str ? `/asarlar?${str}` : '/asarlar';
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Anchor for pagination top scroll */}
      <div id="catalogue-results-top" />

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C1917] tracking-tight flex items-center gap-2.5">
          <Compass className="w-7 h-7 text-amber-600" />
          <span>Asarlar katalogi</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          O‘zbek adabiyotining sara kitoblari, qissalari va davomli hikoyalari
        </p>
      </div>

      {/* Primary Catalog Type Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F5F2EC] rounded-2xl w-fit border border-[#EAE5DD]">
        <Link
          href={buildUrl({ type: undefined, page: undefined })}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
            !typeFilter
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900',
          )}
        >
          <Compass className="w-4 h-4 text-amber-600" />
          <span>Barchasi</span>
        </Link>

        <Link
          href={buildUrl({ type: 'book', page: undefined })}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
            typeFilter === 'book'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900',
          )}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>Kitoblar</span>
        </Link>

        <Link
          href={buildUrl({ type: 'serialized_story', page: undefined })}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all',
            typeFilter === 'serialized_story'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-200'
              : 'text-stone-600 hover:text-stone-900',
          )}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Hikoyalar</span>
        </Link>
      </div>

      {/* 10 Curated Collections Carousel / Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Sara to‘plamlar:
          </span>
          {collectionFilter && (
            <Link
              href={buildUrl({ collection: undefined, page: undefined })}
              className="text-xs font-bold text-amber-800 hover:underline"
            >
              To‘plamni tozalash
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          {[
            { id: undefined, label: 'Barcha to‘plamlar' },
            { id: 'ommabop', label: '🔥 Hozir ommabop' },
            { id: 'eng_kop_oqilgan', label: '📖 Eng ko‘p o‘qilgan' },
            { id: 'bestseller', label: '🏅 Bestsellerlar' },
            { id: 'kitobxonlar_sevgan', label: '❤️ Kitobxonlar sevgan' },
            { id: 'yangi_boshlangan', label: '✨ Yangi boshlangan' },
            { id: 'yaqinda_yangilangan', label: '⚡ Yaqinda yangilangan' },
            { id: 'tugallangan', label: '🏁 Tugallangan asarlar' },
            { id: '15_daqiqa', label: '⏱️ 15 daqiqalik hikoyalar' },
            { id: 'bepul', label: '🎁 Bepul o‘qish' },
            { id: 'muharrir_tanlovi', label: '⭐ Muharrir tanlovi' },
            { id: 'yangi_mualliflar', label: '✍️ Yangi mualliflar' },
            { id: 'eng_kop_muhokama', label: '💬 Eng ko‘p muhokama' },
            { id: 'top_haftalik', label: '🏆 Haftaning top asarlari' },
          ].map((col) => {
            const isActive = col.id === collectionFilter || (!col.id && !collectionFilter);
            return (
              <Link
                key={col.label}
                href={buildUrl({ collection: col.id, page: undefined })}
                className={clsx(
                  'px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 whitespace-nowrap border',
                  isActive
                    ? 'bg-amber-100/90 border-amber-300 text-amber-950 shadow-2xs'
                    : 'bg-white border-[#EAE5DD] text-stone-600 hover:text-stone-900 hover:bg-stone-50',
                )}
              >
                {col.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAE5DD] shadow-xs space-y-4">
        {/* Search input form */}
        <form
          method="GET"
          action="/asarlar"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Asar nomi, muallif yoki kalit so‘z..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DD] focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#FEF3C7] outline-hidden text-xs sm:text-sm text-[#1C1917] placeholder-[#A8A29E] transition-all"
            />
            {genreSlug && <input type="hidden" name="genre" value={genreSlug} />}
            {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
            {accessFilter && <input type="hidden" name="access" value={accessFilter} />}
            {sortBy && <input type="hidden" name="sort" value={sortBy} />}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-2xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
          >
            Qidirish
          </button>
        </form>

        {/* Filter Badges & Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F5F2EC] text-xs">
          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={buildUrl({ access: undefined, page: undefined })}
              className={clsx(
                'px-3 py-1.5 rounded-xl font-bold transition-colors',
                !accessFilter
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]',
              )}
            >
              Hammasi
            </Link>

            <Link
              href={buildUrl({
                access: accessFilter === 'free' ? undefined : 'free',
                page: undefined,
              })}
              className={clsx(
                'px-3 py-1.5 rounded-xl font-bold transition-colors',
                accessFilter === 'free'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]',
              )}
            >
              Bepul
            </Link>

            <Link
              href={buildUrl({
                access: accessFilter === 'paid_full_work' ? undefined : 'paid_full_work',
                page: undefined,
              })}
              className={clsx(
                'px-3 py-1.5 rounded-xl font-bold transition-colors',
                accessFilter === 'paid_full_work'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]',
              )}
            >
              Pullik
            </Link>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-bold">Tartiblash:</span>
            <div className="flex items-center gap-1">
              {[
                { label: 'Yangi', value: 'newest' },
                { label: 'Ommabop', value: 'popular' },
                { label: 'Reyting', value: 'rating' },
              ].map((s) => (
                <Link
                  key={s.value}
                  href={buildUrl({ sort: s.value, page: undefined })}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors',
                    sortBy === s.value
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100',
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Genres Pill Bar */}
        <div className="pt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <Link
            href={buildUrl({ genre: undefined, page: undefined })}
            className={clsx(
              'px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors',
              !genreSlug
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                : 'bg-[#FAF8F5] border border-[#EAE5DD] text-stone-600 hover:bg-stone-100',
            )}
          >
            Barcha janrlar
          </Link>
          {genres.map((g) => {
            const isSelected = genreSlug === g.slug;
            return (
              <Link
                key={g.id}
                href={buildUrl({ genre: isSelected ? undefined : g.slug, page: undefined })}
                className={clsx(
                  'px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors',
                  isSelected
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                    : 'bg-[#FAF8F5] border border-[#EAE5DD] text-stone-600 hover:bg-stone-100',
                )}
              >
                {g.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Works Listing Grid */}
      {works.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-sans font-bold text-stone-800 text-base">Asarlar topilmadi</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Qidiruv so‘rovi yoki tanlangan filtrlar bo‘yicha asar topilmadi. Boshqa filtrlarni sinab
            ko‘ring.
          </p>
          <Link
            href="/asarlar"
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Filtrlarni tozalash
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>

          {/* Catalogue Pagination: 20 per page */}
          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={20}
            scrollTargetId="catalogue-results-top"
          />
        </>
      )}
    </div>
  );
}
