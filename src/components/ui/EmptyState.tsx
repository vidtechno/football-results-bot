import React from 'react';
import { SearchX, Building2, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'search' | 'building' | 'help';
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'Ma’lumot topilmadi',
  description = 'Kechirasiz, so‘rovingizga mos keladigan tashkilot yoki xizmat topilmadi. Boshqa so‘z yoki filtr bilan urinib ko‘ring.',
  icon = 'search',
  action,
}: EmptyStateProps) {
  const IconComponent =
    icon === 'building' ? Building2 : icon === 'help' ? HelpCircle : SearchX;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm my-4">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-4 text-sky-600">
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
