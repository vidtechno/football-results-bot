import React from 'react';
import Link from 'next/link';
import { Search, Compass, Filter, BookOpen } from 'lucide-react';
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
  };
}

export default async function AsarlarPage({ searchParams }: AsarlarPageProps) {
  const query = searchParams.q || '';
  const genreSlug = searchParams.genre;
  const typeFilter = searchParams.type;
  const accessFilter = searchParams.access;
  const statusFilter = searchParams.status;

  const [works, genres] = await Promise.all([
    getPublishedWorks({
      query: query || undefined,
      genreSlug: genreSlug || undefined,
      type: typeFilter || undefined,
      accessType: accessFilter || undefined,
      completionStatus: statusFilter || undefined,
      limit: 40,
    }),
    getActiveGenres(),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black font-serif text-[#1C1917] tracking-tight">
          Barcha asarlar
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          O‘zbek tilidagi eng yaxshi kitoblar va serialized hikoyalar to‘plami
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#EAE5DD] shadow-xs space-y-4">
        {/* Search input form */}
        <form method="GET" action="/asarlar" className="relative flex items-center">
          <Search className="w-5 h-5 text-[#A8A29E] absolute left-4 pointer-events-none" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Asar nomi, muallif yoki mavzu bo‘yicha qidiring..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE5DD] focus:bg-white focus:border-[#B45309] focus:ring-2 focus:ring-[#FEF3C7] outline-hidden text-xs sm:text-sm font-medium text-[#1C1917] transition-all placeholder-[#A8A29E]"
          />
          {genreSlug && <input type="hidden" name="genre" value={genreSlug} />}
          {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
          {accessFilter && <input type="hidden" name="access" value={accessFilter} />}
        </form>

        {/* Filter Badges & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F5F2EC] text-xs">
          <Link
            href="/asarlar"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              !typeFilter && !accessFilter && !genreSlug
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Barchasi
          </Link>

          <Link
            href={`/asarlar?type=book${genreSlug ? `&genre=${genreSlug}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              typeFilter === 'book'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Kitoblar
          </Link>

          <Link
            href={`/asarlar?type=serialized_story${genreSlug ? `&genre=${genreSlug}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              typeFilter === 'serialized_story'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Davomli asarlar
          </Link>

          <Link
            href={`/asarlar?access=free${genreSlug ? `&genre=${genreSlug}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              accessFilter === 'free'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Bepul
          </Link>

          {/* Genre select or chips */}
          {genres.map((g) => {
            const isSelected = genreSlug === g.slug;
            return (
              <Link
                key={g.id}
                href={`/asarlar?genre=${g.slug}${typeFilter ? `&type=${typeFilter}` : ''}`}
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
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#78716C] font-bold px-1">
          <span>{works.length} ta asar topildi</span>
          {(query || genreSlug || typeFilter || accessFilter) && (
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
