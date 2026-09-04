import React from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, SlidersHorizontal } from 'lucide-react';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';
import { WorkGrid } from '@/components/works/WorkGrid';

export const revalidate = 30;

interface AsarlarPageProps {
  searchParams: {
    q?: string;
    genre?: string;
    type?: 'book' | 'serialized_story';
    access?: 'free' | 'paid_full_work' | 'paid_by_chapter';
    status?: 'ongoing' | 'completed';
    sort?: 'popular' | 'newest' | 'price_asc' | 'price_desc';
  };
}

export default async function AsarlarPage({ searchParams }: AsarlarPageProps) {
  const query = searchParams.q || '';
  const genreSlug = searchParams.genre;
  const typeFilter = searchParams.type;
  const accessFilter = searchParams.access;
  const statusFilter = searchParams.status;
  const sortBy = searchParams.sort || 'newest';

  const [works, genres] = await Promise.all([
    getPublishedWorks({
      query: query || undefined,
      genreSlug: genreSlug || undefined,
      type: typeFilter || undefined,
      accessType: accessFilter || undefined,
      completionStatus: statusFilter || undefined,
      sortBy: sortBy,
      limit: 40,
    }),
    getActiveGenres(),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight">
          Asarlar katalogi
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          O‘zbek adabiyotining sara kitoblari, qissalari va serialized hikoyalari
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#EAE5DD] shadow-xs space-y-4">
        {/* Search input form */}
        <form method="GET" action="/asarlar" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Asar nomi, muallif yoki mavzu bo‘yicha qidiring..."
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
          {/* Quick Access Badges */}
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
              href={`/asarlar?type=book${genreSlug ? `&genre=${genreSlug}` : ''}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                typeFilter === 'book'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Kitoblar
            </Link>

            <Link
              href={`/asarlar?type=serialized_story${genreSlug ? `&genre=${genreSlug}` : ''}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                typeFilter === 'serialized_story'
                  ? 'bg-[#B45309] text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Davomli hikoyalar
            </Link>

            <Link
              href={`/asarlar?access=free${genreSlug ? `&genre=${genreSlug}` : ''}${query ? `&q=${query}` : ''}`}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                accessFilter === 'free'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
              }`}
            >
              Bepul
            </Link>

            {/* Genres */}
            {genres.map((g) => {
              const isSelected = genreSlug === g.slug;
              return (
                <Link
                  key={g.id}
                  href={`/asarlar?genre=${g.slug}${typeFilter ? `&type=${typeFilter}` : ''}${query ? `&q=${query}` : ''}`}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                    isSelected
                      ? 'bg-[#B45309] text-white shadow-xs'
                      : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
                  }`}
                >
                  {g.name}
                </Link>
              );
            })}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] text-[#78716C] font-semibold">Saralash:</span>
            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#EAE5DD] p-0.5 rounded-xl">
              <Link
                href={`/asarlar?sort=newest${genreSlug ? `&genre=${genreSlug}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}${query ? `&q=${query}` : ''}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-white text-[#1C1917] shadow-2xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Yangi
              </Link>
              <Link
                href={`/asarlar?sort=price_asc${genreSlug ? `&genre=${genreSlug}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}${query ? `&q=${query}` : ''}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  sortBy === 'price_asc'
                    ? 'bg-white text-[#1C1917] shadow-2xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Arzonroq
              </Link>
              <Link
                href={`/asarlar?sort=price_desc${genreSlug ? `&genre=${genreSlug}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}${query ? `&q=${query}` : ''}`}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  sortBy === 'price_desc'
                    ? 'bg-white text-[#1C1917] shadow-2xs'
                    : 'text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                Qimmatroq
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#78716C] font-bold px-1">
          <span>{works.length} ta asar topildi</span>
          {(query || genreSlug || typeFilter || accessFilter || sortBy !== 'newest') && (
            <Link href="/asarlar" className="text-[#B45309] hover:underline">
              Filtrni tozalash
            </Link>
          )}
        </div>

        <WorkGrid
          works={works}
          emptyMessage={
            query
              ? `"${query}" so‘rovi bo‘yicha hech qanday asar topilmadi.`
              : 'Tanlangan filtrlar bo‘yicha asarlar hozircha mavjud emas.'
          }
        />
      </div>
    </div>
  );
}
