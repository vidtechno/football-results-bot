import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: number | string;
  change?: string;
  icon: React.ElementType;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'indigo' | 'rose';
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  description,
}: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={clsx('w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{value}</span>
        {change && (
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {change}
          </span>
        )}
      </div>

      {description && <p className="text-xs text-slate-400 font-medium">{description}</p>}
    </div>
  );
}
