'use client';

import React from 'react';
import Link from 'next/link';
import { Organization } from '@/lib/types/directory';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { trackEvent } from '@/lib/utils/analytics';
import { Search, ChevronRight, TrendingUp, Info } from 'lucide-react';

interface PopularSearchSectionProps {
  organizations?: Organization[];
}

export function PopularSearchSection({ organizations = [] }: PopularSearchSectionProps) {
  const hasPopularData = organizations.length > 0;

  return (
    <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 font-black flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Ko‘p qidiriladiganlar</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              So‘nggi 30 kundagi foydalanuvchi qidiruvlari asosida.
            </p>
          </div>
        </div>
      </div>

      {/* Content: Real popular items grid OR real empty state */}
      {!hasPopularData ? (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Info className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-600">
            Hali yetarli qidiruv ma’lumoti to‘planmadi.
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Foydalanuvchilar qidiruvi va ko‘rishlari asosida eng ommabop tashkilotlar avtomatik shakllanadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {organizations.slice(0, 5).map((org) => {
            return (
              <Link
                key={org.id}
                href={`/organizations/${org.slug}`}
                onClick={() => trackEvent(org.id, 'card_click')}
                className="group p-3 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between space-y-3 min-h-[110px] active:scale-95"
              >
                <div className="flex items-center justify-between">
                  <OrganizationAvatar
                    name={org.name}
                    logoUrl={org.logo_url}
                    type={org.organization_type}
                    categorySlug={org.category?.slug}
                    size="sm"
                  />
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>

                <div className="min-w-0">
                  <strong className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors block truncate leading-tight">
                    {org.name}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-semibold block truncate mt-0.5">
                    {org.category?.name || 'Tashkilot'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
