import React from 'react';
import Link from 'next/link';
import { Layers, ShieldAlert, Heart, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-600 text-xs py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Logo & Description */}
          <div className="space-y-2 max-w-lg">
            <Link href="/" className="flex items-center gap-2 font-black text-slate-900 text-base">
              <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span>Manbora</span>
            </Link>
            <p className="text-slate-500 leading-relaxed text-[11px] font-medium">
              Manbora — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay katalog. Kerakli tashkilotni tez toping.
            </p>
          </div>

          {/* Quick Nav Links */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Bosh sahifa</Link>
            <Link href="/search" className="hover:text-blue-600 transition-colors">Qidiruv</Link>
            <Link href="/categories" className="hover:text-blue-600 transition-colors">Kategoriyalar</Link>
            <Link href="/regions" className="hover:text-blue-600 transition-colors">Viloyatlar</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">Biz haqimizda</Link>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 leading-relaxed font-medium">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Mustaqil platforma:</strong> Manbora mustaqil ma’lumotnoma platformasi. Davlatning rasmiy portali emas.
            </p>
          </div>

          <span className="flex items-center gap-1 text-slate-600 flex-shrink-0 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ma’lumotlar rasmiy manbalar asosida tekshiriladi.</span>
          </span>
        </div>

        {/* Copyright */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
          <span>© {new Date().getFullYear()} Manbora (https://manbora.uz). Barcha huquqlar himoyalangan.</span>
          <span className="flex items-center gap-1">
            O‘zbekiston fuqarolari va tadbirkorlari uchun <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </span>
        </div>
      </div>
    </footer>
  );
}
