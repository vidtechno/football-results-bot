import React from 'react';
import Link from 'next/link';
import { getRegions } from '@/lib/db/directory';
import { MapPin, ChevronRight } from 'lucide-react';

export const revalidate = 300;

export default async function RegionsPage() {
  const regions = await getRegions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-sky-600" />
          <span>O‘zbekiston viloyatlari va hududlari</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Hududlar bo‘yicha tashkilotlar hamda aloqa markazlarini saralang
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((reg) => (
          <Link
            key={reg.slug}
            href={`/search?region=${reg.slug}`}
            className="directory-card p-5 flex items-center justify-between group hover:border-sky-500"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors">
                  {reg.name}
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {reg.organization_count || 0} ta tashkilot
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
