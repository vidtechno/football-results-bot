import React from 'react';
import { SearchX, BookOpen, HelpCircle } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: 'search' | 'book' | 'help';
  action?: React.ReactNode;
}

export function EmptyState({
  title = 'Ma’lumot topilmadi',
  description = 'Kechirasiz, so‘rovingizga mos keladigan asar yoki ma’lumot topilmadi.',
  icon = 'search',
  action,
}: EmptyStateProps) {
  const IconComponent =
    icon === 'book' ? BookOpen : icon === 'help' ? HelpCircle : SearchX;

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm my-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600">
        <IconComponent className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
