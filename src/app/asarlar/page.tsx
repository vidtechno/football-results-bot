import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Search, Filter, Compass, BookOpen, SlidersHorizontal, Sparkles } from 'lucide-react';
import { getPaginatedCatalogue, getActiveGenres } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { CataloguePagination } from '@/components/catalogue/CataloguePagination';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Barcha asarlar katalogi',
  description: 'O‘zbek adabiyotining sara kitoblari, davomli hikoyalari va qissalari katalogi. Bepul va pullik elektron asarlar mutolaasi.',
  alternates: {
    canonical: '/asarlar',
  },
};

interface AsarlarPageProps {
  searchParams: {
    q?: string;
    genre?: string;
    type?: 'book' | 'serialized_story';
    access?: 'free' | 'paid_full_work' | 'paid_by_chapter';
    status?: 'ongoing' | 'completed';
    sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
    page?: string;
  };
}

export default async function AsarlarPage({ searchParams }: AsarlarPageProps) {
  const query = searchParams.q || '';
  const genreSlug = searchParams.genre;
  const typeFilter = searchParams.type;
  const accessFilter = searchParams.access;
  const statusFilter = searchParams.status;
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
    }),
    getActiveGenres(),
  ]);

  const { works, totalCount, totalPages } = catalogue;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Anchor for pagination top scroll */}
      <div id="catalogue-results-top" />

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight flex items-center gap-2.5">
          <Compass className="w-7 h-7 text-amber-600" />
          <span>Asarlar katalogi</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          O‘zbek adabiyotining sara kitoblari, qissalari va serialized hikoyalari
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAE5DD] shadow-xs space-y-4">
        {/* Search input form */}
        <form method="GET" action="/asarlar" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
              href={`/asarlar${query ? `?q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                !typeFilter && !accessFilter && !genreSlug
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Barchasi
            </Link>

            <Link
              href={`/asarlar?access=free${typeFilter ? `&type=${typeFilter}` : ''}${genreSlug ? `&genre=${genreSlug}` : ''}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                accessFilter === 'free'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Bepul
            </Link>

            <Link
              href={`/asarlar?access=paid_full_work${typeFilter ? `&type=${typeFilter}` : ''}${genreSlug ? `&genre=${genreSlug}` : ''}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                accessFilter === 'paid_full_work'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
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
                  href={`/asarlar?sort=${s.value}${typeFilter ? `&type=${typeFilter}` : ''}${genreSlug ? `&genre=${genreSlug}` : ''}${accessFilter ? `&access=${accessFilter}` : ''}${query ? `&q=${query}` : ''}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    sortBy === s.value
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                  }`}
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
            href={`/asarlar${typeFilter ? `?type=${typeFilter}` : ''}${query ? `&q=${query}` : ''}`}
            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors ${
              !genreSlug
                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                : 'bg-[#FAF8F5] border border-[#EAE5DD] text-stone-600 hover:bg-stone-100'
            }`}
          >
            Barcha janrlar
          </Link>
          {genres.map((g) => {
            const isSelected = genreSlug === g.slug;
            return (
              <Link
                key={g.id}
                href={`/asarlar?genre=${g.slug}${typeFilter ? `&type=${typeFilter}` : ''}${accessFilter ? `&access=${accessFilter}` : ''}${query ? `&q=${query}` : ''}`}
                className={`px-3 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                    : 'bg-[#FAF8F5] border border-[#EAE5DD] text-stone-600 hover:bg-stone-100'
                }`}
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
          <h3 className="font-serif font-bold text-stone-800 text-base">Asarlar topilmadi</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Qidiruv so‘rovi yoki tanlangan filtrlar bo‘yicha asar topilmadi. Boshqa filtrlarni sinab ko‘ring.
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
