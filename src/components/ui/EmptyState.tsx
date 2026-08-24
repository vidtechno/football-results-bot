import React from 'react';
import { CalendarX, Trophy, ShieldAlert } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'calendar' | 'trophy' | 'search';
}

export function EmptyState({
  title = 'O‘yinlar topilmadi',
  description = 'Ushbu sana yoki musobaqa bo‘yicha hozircha hech qanday o‘yin mavjud emas.',
  icon = 'calendar',
}: EmptyStateProps) {
  const IconComponent =
    icon === 'trophy' ? Trophy : icon === 'search' ? ShieldAlert : CalendarX;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center glass-card rounded-2xl my-4 border border-slate-800/80">
      <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 text-emerald-400">
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
    </div>
  );
}
