import React from 'react';
import { formatUzbekDateTime } from '@/lib/utils/formatters';
import { RefreshCw } from 'lucide-react';

interface FooterProps {
  lastSyncTime?: string | null;
}

export function Footer({ lastSyncTime }: FooterProps) {
  const formattedSync = lastSyncTime
    ? formatUzbekDateTime(lastSyncTime)
    : 'Yaqinda yangilangan';

  return (
    <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 text-slate-400 text-sm py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">Futbol Natija</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Barcha futbol o‘yinlari va natijalari Uzbek Latin tilida</span>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-800 text-slate-300">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          <span>Oxirgi yangilanish: <strong className="text-emerald-400 font-medium">{formattedSync}</strong></span>
        </div>

        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} Futbol Natija. Toshkent vaqti (Asia/Tashkent).
        </div>
      </div>
    </footer>
  );
}
