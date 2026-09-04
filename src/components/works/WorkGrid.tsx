import React from 'react';
import { WorkCard } from './WorkCard';
import type { Work } from '@/lib/types/platform';
import { BookOpen } from 'lucide-react';

interface WorkGridProps {
  works: Work[];
  emptyMessage?: string;
}

export function WorkGrid({ works, emptyMessage = 'Hozircha hech qanday asar topilmadi' }: WorkGridProps) {
  if (!works || works.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 my-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
          <BookOpen className="w-7 h-7" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-5">
      {works.map((work) => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
}
