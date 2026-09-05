import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Tag, BookOpen, ChevronRight, Layers } from 'lucide-react';
import { getGenresWithCounts } from '@/lib/db/queries';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Janrlar katalogi | Manbora',
  description: 'O‘zbek adabiyoti va jahon asarlari janrlar bo‘yicha: Roman, Qissa, Detektiv, Fantastika, Tarixiy, Biznes va boshqalar.',
};

export default async function JanrlarPage() {
  const genres = await getGenresWithCounts();

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight flex items-center gap-2.5">
          <Layers className="w-7 h-7 text-amber-600" />
          <span>Barcha janrlar</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          O‘zingiz qiziqqan yo‘nalishdagi sara asarlar, romanlar va qissalarni toping
        </p>
      </div>

      {/* Genres Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4.5">
        {genres.map((genre) => (
          <Link
            key={genre.id}
            href={`/janrlar/${genre.slug}`}
            className="group bg-white p-5 rounded-3xl border border-[#EAE5DD] hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-amber-700 flex items-center justify-center transition-colors">
                  <Tag className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FAF8F5] text-stone-600 border border-[#EAE5DD]">
                  {genre.works_count} ta asar
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold font-serif text-stone-900 group-hover:text-amber-700 transition-colors">
                  {genre.name}
                </h3>
                {genre.description && (
                  <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                    {genre.description}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:text-amber-800">
              <span>Asarlarni ko‘rish</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
