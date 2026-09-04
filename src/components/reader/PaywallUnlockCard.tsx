'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lock, Wallet, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';

interface PaywallUnlockCardProps {
  workId: string;
  chapterId: string;
  chapterTitle: string;
  price: number;
  userBalance?: number;
  isLoggedIn: boolean;
  onUnlocked?: () => void;
}

export function PaywallUnlockCard({
  workId,
  chapterId,
  chapterTitle,
  price,
  userBalance = 0,
  isLoggedIn,
  onUnlocked,
}: PaywallUnlockCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasEnoughBalance = userBalance >= price;

  async function handleUnlock() {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/purchases/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId,
          chapterId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xarid jarayonida xatolik yuz berdi');
      }

      setSuccess(true);
      if (onUnlocked) {
        setTimeout(onUnlocked, 1000);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white border border-blue-200/80 rounded-3xl shadow-sm text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
        <Lock className="w-7 h-7" />
      </div>

      <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">
        Ushbu bob pullik kontent hisoblanadi
      </h3>
      <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
        Muallifni qo‘llab-quvvatlash va bobni to‘liq mutolaa qilish uchun Manbora balansingizdan ochishingiz mumkin.
      </p>

      {/* Price & Balance Box */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Bob narxi
          </span>
          <p className="text-lg sm:text-xl font-black text-blue-600">
            {formatUZS(price)}
          </p>
        </div>

        {isLoggedIn && (
          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 w-full sm:w-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center sm:justify-end gap-1">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              Sizning balansingiz
            </span>
            <p className="text-base sm:text-lg font-extrabold text-slate-800">
              {formatUZS(userBalance)}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Bob muvaffaqiyatli ochildi! Yuklanmoqda...</span>
        </div>
      )}

      {!isLoggedIn ? (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/kirish?redirect=/asarlar`}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Kirish yoki Ro‘yxatdan o‘tish</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : hasEnoughBalance ? (
        <button
          onClick={handleUnlock}
          disabled={loading || success}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Ochilmoqda...</span>
            </>
          ) : (
            <>
              <span>Balansdan ochish ({formatUZS(price)})</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200/80 p-3 rounded-xl">
            Balansingizda mablag‘ yetarli emas. Bobni ochish uchun hisobingizni to‘ldiring.
          </div>
          <Link
            href="/kabinet"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>Hisobni to‘ldirish</span>
          </Link>
        </div>
      )}
    </div>
  );
}
