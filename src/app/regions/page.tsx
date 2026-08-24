import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getRegions } from '@/lib/db/directory';
import { MapPin, ChevronRight } from 'lucide-react';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'O‘zbekiston viloyatlari va hududlari — Manbora',
  description: 'O‘zbekiston Respublikasi viloyatlari va shahar hududlari bo‘yicha tashkilotlar aloqa katalogi.',
  alternates: {
    canonical: 'https://manbora.uz/regions',
  },
};

export default async function RegionsPage() {
  const regions = await getRegions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-blue-600" />
          <span>O‘zbekiston viloyatlari va hududlari</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Hududlar bo‘yicha tashkilotlar hamda aloqa markazlarini saralang
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {regions.map((reg) => (
          <Link
            key={reg.slug}
            href={`/search?region=${reg.slug}`}
            className="directory-card p-5 flex items-center justify-between group hover:border-blue-500"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                  {reg.name}
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  {reg.organization_count || 0} ta tashkilot
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
