import React from 'react';
import type { Metadata } from 'next';
import { Info, ShieldCheck, Layers, AlertTriangle, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Biz haqimizda — Manbora platformasi',
  description: 'Manbora — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay va mustaqil katalog.',
  alternates: {
    canonical: 'https://manbora.uz/about',
  },
};

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
          <Info className="w-4 h-4" />
          <span>Loyiha Haqida</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Manbora — Mustaqil Aloqa Katalogi
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
          Manbora — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay va mustaqil katalog. Kerakli tashkilotni tez toping.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Ochiq Manbalar</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Platformada ko‘rsatilgan barcha telefon raqamlari, veb-saytlar va manzillar faqat rasmiy hamda ochiq ma’lumotlar bazalaridan jamlangan.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Rasmiy Tekshiruv</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Ma’lumotlar rasmiy manbalar va fuqarolar tomonidan yuborilgan tuzatish xabarnomalari asosida muntazam tekshirib boriladi.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">100% O‘zbek Latin</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Barcha interfeys va tashkilot nomlari barcha fuqarolar uchun qulay bo‘lgan O‘zbek Latin yozuvida taqdim etiladi.
          </p>
        </div>
      </div>

      {/* Official Disclaimer Box */}
      <div className="bg-amber-50 rounded-3xl p-6 sm:p-8 border border-amber-200 space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-lg">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <span>Mustaqil Platforma Ogohlantirishi</span>
        </div>
        <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
          Manbora mustaqil ma’lumotnoma platformasi. Davlatning rasmiy portali emas. Shoshilinch, moliyaviy yoki huquqiy masalalarda telefon raqamlari hamda rekvizitlarni tashkilotning bevosita rasmiy veb-sayti orqali ham tasdiqlash tavsiya etiladi.
        </p>
      </div>
    </div>
  );
}
