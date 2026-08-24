'use client';

import React from 'react';
import Image from 'next/image';
import { TARGET_COMPETITIONS } from '@/lib/constants/competitions';
import { clsx } from 'clsx';

interface CompetitionFilterProps {
  selectedCompetitionId?: number;
  onSelectCompetition: (id?: number) => void;
}

export function CompetitionFilter({
  selectedCompetitionId,
  onSelectCompetition,
}: CompetitionFilterProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelectCompetition(undefined)}
        className={clsx(
          'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border',
          !selectedCompetitionId
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800',
        )}
      >
        Barchasi
      </button>

      {TARGET_COMPETITIONS.map((comp) => {
        const isActive = selectedCompetitionId === comp.providerId;
        return (
          <button
            key={comp.providerId}
            onClick={() => onSelectCompetition(isActive ? undefined : comp.providerId)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border',
              isActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-semibold'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800',
            )}
          >
            {comp.logoUrl && (
              <Image
                src={comp.logoUrl}
                alt={comp.nameUz}
                width={14}
                height={14}
                className="object-contain"
              />
            )}
            <span>{comp.nameUz}</span>
          </button>
        );
      })}
    </div>
  );
}
