'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Flame, Zap, Stethoscope, Building2, ChevronRight } from 'lucide-react';

interface PopularItem {
  query: string;
  name: string;
  category: string;
  icon: any;
  slug?: string;
  gradient: string;
}

const popularItems: PopularItem[] = [
  {
    query: 'Anorbank',
    name: 'Anorbank',
    category: 'Tijorat Banki',
    icon: Building2,
    slug: 'anorbank',
    gradient: 'from-blue-600 to-indigo-600',
  },
  {
    query: 'Ipoteka-bank',
    name: 'Ipoteka-bank',
    category: 'Tijorat Banki',
    icon: Building2,
    slug: 'ipoteka-bank',
    gradient: 'from-sky-600 to-blue-700',
  },
  {
    query: 'Elektr',
    name: 'Elektr tarmoqlari',
    category: 'Kommunal Xizmat',
    icon: Zap,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    query: 'Gaz',
    name: 'Gaz ta’minoti (Hududgaz)',
    category: 'Kommunal Xizmat',
    icon: Flame,
    gradient: 'from-rose-500 to-red-600',
  },
  {
    query: 'Tez yordam',
    name: 'Tez Yordam (103)',
    category: 'Tibbiy Xizmat',
    icon: Stethoscope,
    gradient: 'from-emerald-600 to-teal-700',
  },
];

export function PopularSearchSection() {
  return (
    <section className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 font-black">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Ko‘p qidiriladiganlar</h2>
            <p className="text-xs text-slate-500 font-medium">Aholi orasida eng ko‘p murojaat qilinadigan tashkilot va xizmatlar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {popularItems.map((item) => {
          const Icon = item.icon;
          const href = item.slug ? `/organizations/${item.slug}` : `/search?q=${encodeURIComponent(item.query)}`;

          return (
            <Link
              key={item.name}
              href={href}
              className="group p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div>
                <strong className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors block">
                  {item.name}
                </strong>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{item.category}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
