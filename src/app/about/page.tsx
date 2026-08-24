import React from 'react';
import { Info, ShieldCheck, Zap, Database, Server, Clock } from 'lucide-react';
import { TARGET_COMPETITIONS } from '@/lib/constants/competitions';

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <Info className="w-4 h-4" />
          <span>Loyiha Haqida</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Futbol Natija — Milliy Futbol Portali
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Futbol Natija — O‘zbekiston futbol ixlosmandlari uchun maxsus yaratilgan, tezkor va zamonaviy o‘yinlar taqvimi hamda natijalari platformasidir.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Tezkor Natijalar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Barcha o‘yin natijalari va jadvallari Supabase PostgreSQL bazasida sinxronizatsiya qilinadi va Toshkent vaqtida taqdim etiladi.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Rasmiy Manba</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ma’lumotlar API-Football (API-Sports) xizmati orqali avtomatik ravishda har 6 soatda xavfsiz server cronic cron kanali orqali yangilanadi.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">100% O‘zbek Latin</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Platformadagi barcha matnlar, o‘yin holatlari, sanalar va haftaning kunlari O‘zbek Latin tilida mukammal shakllantirilgan.
          </p>
        </div>
      </div>

      {/* Supported Competitions Grid */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>Kuzatib boriladigan top 10 musobaqa</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {TARGET_COMPETITIONS.map((comp) => (
            <div
              key={comp.slug}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80"
            >
              <span className="text-lg">{comp.flag}</span>
              <div>
                <span className="font-bold text-slate-200 block">{comp.nameUz}</span>
                <span className="text-xs text-slate-500">{comp.countryUz}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
