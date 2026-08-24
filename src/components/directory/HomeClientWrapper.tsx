'use client';

import React, { useState } from 'react';
import { SuggestOrganizationModal } from './SuggestOrganizationModal';
import { PlusCircle, Building2 } from 'lucide-react';
import { Category, Region } from '@/lib/types/directory';

interface HomeClientWrapperProps {
  categories: Category[];
  regions: Region[];
}

export function HomeClientWrapper({ categories, regions }: HomeClientWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-600/20">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-bold">
            <Building2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Katalogimizni birgalikda boyitaylik</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black">Izlagan tashkilotingizni topolmadingizmi?</h3>
          <p className="text-xs sm:text-sm text-sky-100 font-medium max-w-xl">
            Yangi davlat muassasasi, bank yoki xizmat aloqa ma’lumotlarini taklif qiling, biz tekshirib reestrga kiritamiz.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-blue-700 font-black text-xs shadow-lg shadow-black/10 flex items-center gap-2 active:scale-95 transition-all flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Tashkilot taklif qilish</span>
        </button>
      </section>

      <SuggestOrganizationModal
        categories={categories}
        regions={regions}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
