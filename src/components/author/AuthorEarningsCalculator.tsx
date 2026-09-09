'use client';

import React, { useState } from 'react';
import { Calculator, Sparkles, TrendingUp } from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';

interface AuthorEarningsCalculatorProps {
  commissionPercentage: number;
}

export function AuthorEarningsCalculator({ commissionPercentage = 20 }: AuthorEarningsCalculatorProps) {
  const [price, setPrice] = useState<number>(15000);
  const [readersCount, setReadersCount] = useState<number>(500);

  const authorPercentage = 100 - commissionPercentage;
  const grossTotal = price * readersCount;
  const platformFee = Math.floor((grossTotal * commissionPercentage) / 100);
  const authorNet = grossTotal - platformFee;

  const PRESET_PRICES = [5000, 10000, 15000, 25000, 50000];

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-300">
          <Calculator className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif font-black text-xl text-stone-900">Daromad kalkulyatori</h3>
          <p className="text-xs text-stone-500">
            Asaringiz narxi va xaridlar soniga qarab taxminiy daromadingizni hisoblang
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Asarning umumiy narxi:
              </label>
              <span className="font-mono font-bold text-amber-800 text-sm">
                {formatUZS(price)}
              </span>
            </div>
            <input
              type="range"
              min={2000}
              max={100000}
              step={1000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {PRESET_PRICES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrice(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    price === p
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {formatUZS(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Muvaffaqiyatli xaridlar soni:
              </label>
              <span className="font-mono font-bold text-stone-900 text-sm">
                {readersCount.toLocaleString()} ta
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={10000}
              step={50}
              value={readersCount}
              onChange={(e) => setReadersCount(Number(e.target.value))}
              className="w-full accent-stone-900 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-stone-400 font-medium mt-1">
              <span>10 ta</span>
              <span>1,000 ta</span>
              <span>5,000 ta</span>
              <span>10,000 ta</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Shaffof daromad taqsimoti:</span>
            </div>
            <p className="text-[11px] text-amber-900/80">
              Muallifga <strong className="font-bold text-amber-950">{authorPercentage}%</strong> sof tushum to‘lanadi.
              Platforma xizmat haqi ({commissionPercentage}%) server, xavfsizlik va to‘lov tizimlari xarajatlarini qoplaydi.
            </p>
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-stone-900 text-white p-6 rounded-3xl flex flex-col justify-between space-y-6 shadow-inner">
          <div className="space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
              Taxminiy natija
            </span>

            <div className="space-y-1">
              <p className="text-xs text-stone-400">Muallif sof daromadi ({authorPercentage}%):</p>
              <h4 className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight">
                {formatUZS(authorNet)}
              </h4>
            </div>

            <div className="pt-4 border-t border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Jami sotuv tushumi (100%):</span>
                <span className="font-mono text-stone-200 font-bold">{formatUZS(grossTotal)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Platforma komissiyasi ({commissionPercentage}%):</span>
                <span className="font-mono text-stone-300">-{formatUZS(platformFee)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700/60 text-[11px] text-stone-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Daromad 100 000 so‘mga yetgach, muallif studiyasidan yechish so‘rovini yuborasiz.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
