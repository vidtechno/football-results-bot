import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Search, Sparkles, BookOpen, Compass } from 'lucide-react';
import { getPaginatedCatalogue, getActiveGenres } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { CataloguePagination } from '@/components/catalogue/CataloguePagination';

export const revalidate = 15;

export const metadata: Metadata = {
  title: 'Asarlarni qidirish | Manbora',
  description: 'Kitoblar, serial hikoyalar, qissalar va sevimli mualliflaringizni nomi, janri yoki kalit so‘zlar bo‘yicha tez qidiring.',
};

const TRENDING_SEARCHES = [
  'Tarixiy',
  'Detektiv',
  'Fantastika',
  'Roman',
  'Biznes',
  'Psixologiya',
  'Sarguzasht',
  'Dramatik',
];

interface QidiruvPageProps {
  searchParams: {
    q?: string;
    genre?: string;
    type?: 'book' | 'serialized_story';
    access?: 'free' | 'paid_full_work' | 'paid_by_chapter';
    sort?: 'popular' | 'newest' | 'rating';
    page?: string;
  };
}

export default async function QidiruvPage({ searchParams }: QidiruvPageProps) {
  const query = searchParams.q || '';
  const genreSlug = searchParams.genre;
  const typeFilter = searchParams.type;
  const accessFilter = searchParams.access;
  const sortBy = searchParams.sort || 'popular';
  const currentPage = Math.max(1, Number(searchParams.page) || 1);

  const [catalogue, genres] = await Promise.all([
    getPaginatedCatalogue({
      page: currentPage,
      pageSize: 20,
      query: query || undefined,
      genreSlug: genreSlug || undefined,
      type: typeFilter || undefined,
      accessType: accessFilter || undefined,
      sortBy: sortBy,
    }),
    getActiveGenres(),
  ]);

  const { works, totalCount, totalPages } = catalogue;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <div id="search-results-top" />

      {/* Header */}
      <div className="space-y-2 text-center max-w-xl mx-auto pt-2 sm:pt-4">
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight">
          Asarlarni qidirish
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          Minglab kitoblar, yangilanuvchi serialized hikoyalar va sara asarlar orasidan qidiring
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-2xl mx-auto space-y-4">
        <form method="GET" action="/qidiruv" className="relative">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            autoFocus
            placeholder="Asar nomi, muallif ismi, janr yoki mavzu..."
            className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-3xl bg-white border-2 border-[#EAE5DD] focus:border-[#B45309] focus:ring-4 focus:ring-amber-500/15 outline-hidden text-sm sm:text-base text-stone-900 placeholder-stone-400 shadow-sm transition-all"
          />
          {genreSlug && <input type="hidden" name="genre" value={genreSlug} />}
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          {accessFilter && <input type="hidden" name="access" value={accessFilter} />}

          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-2xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs sm:text-sm transition-colors shadow-xs"
          >
            Qidirish
          </button>
        </form>

        {/* Trending Searches Tags */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-stone-500">
          <span className="font-semibold text-stone-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Ommabop qidiruvlar:
          </span>
          {TRENDING_SEARCHES.map((term) => (
            <Link
              key={term}
              href={`/qidiruv?q=${encodeURIComponent(term)}`}
              className="px-2.5 py-1 rounded-full bg-white border border-[#EAE5DD] hover:border-amber-400 hover:text-amber-800 transition-colors"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Type filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/qidiruv${query ? `?q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                !typeFilter && !accessFilter && !genreSlug
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Barchasi
            </Link>
            <Link
              href={`/qidiruv?type=book${query ? `&q=${query}` : ''}${accessFilter ? `&access=${accessFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                typeFilter === 'book'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Kitoblar
            </Link>
            <Link
              href={`/qidiruv?type=serialized_story${query ? `&q=${query}` : ''}${accessFilter ? `&access=${accessFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                typeFilter === 'serialized_story'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Hikoyalar
            </Link>
            <Link
              href={`/qidiruv?access=free${query ? `&q=${query}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                accessFilter === 'free'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Bepul
            </Link>
          </div>

          {/* Results count indicator */}
          <div className="text-stone-500 font-semibold text-xs">
            {totalCount > 0 ? (
              <span>Topildi: <strong className="text-stone-900">{totalCount}</strong> ta asar</span>
            ) : (
              <span>Natijalar</span>
            )}
          </div>
        </div>

        {/* Quick Genre Chips */}
        <div className="pt-2 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <Link
            href={`/qidiruv${query ? `?q=${query}` : ''}`}
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
                href={`/qidiruv?genre=${g.slug}${query ? `&q=${query}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}`}
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

      {/* Results or Empty State */}
      {works.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
          <Search className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-stone-800 text-base">Hech qanday asar topilmadi</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {query
              ? `"${query}" so‘rovi bo‘yicha asar topilmadi. So‘zni to‘g‘ri yozganingizni tekshiring yoki janrlar bo‘yicha qidiring.`
              : 'Qidirish uchun yuqoridagi maydonga asar yoki muallif nomini kiriting.'}
          </p>
          <Link
            href="/asarlar"
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Barcha asarlarni ko‘rish
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={20}
            scrollTargetId="search-results-top"
          />
        </>
      )}
    </div>
  );
}
