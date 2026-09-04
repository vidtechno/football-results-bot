'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Lock,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { useAuth } from '@/components/providers/AuthProvider';
import { TopupModal } from '@/components/wallet/TopupModal';

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
  userBalance: initialBalance = 0,
  isLoggedIn,
  onUnlocked,
}: PaywallUnlockCardProps) {
  const { profile, user, balance: authBalance, refreshAuth } = useAuth();
  const currentBalance = typeof authBalance === 'number' ? authBalance : initialBalance;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);

  const hasEnoughBalance = currentBalance >= price;
  const remainingBalance = Math.max(0, currentBalance - price);

  async function handleConfirmUnlock() {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);

    const idempotencyKey = `unlock_${chapterId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch('/api/purchases/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId,
          chapterId,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xarid jarayonida xatolik yuz berdi');
      }

      setSuccess(true);
      setShowConfirm(false);
      await refreshAuth();

      if (onUnlocked) {
        setTimeout(onUnlocked, 800);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="max-w-xl mx-auto my-8 p-6 sm:p-8 bg-white border border-amber-200/90 rounded-3xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200/80">
          <Lock className="w-7 h-7 text-amber-700" />
        </div>

        <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 mb-2">
          Ushbu bob pullik kontent hisoblanadi
        </h3>
        <p className="text-stone-500 text-xs sm:text-sm mb-6 leading-relaxed max-w-md mx-auto">
          Muallif ijodini qo‘llab-quvvatlash va bobni to‘liq mutolaa qilish uchun Manbora balansingizdan ochishingiz mumkin.
        </p>

        {/* Price & Balance Box */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Bob narxi
            </span>
            <p className="font-serif text-lg sm:text-xl font-bold text-amber-900">
              {formatUZS(price)}
            </p>
          </div>

          {isLoggedIn && (
            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-200 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center sm:justify-end gap-1">
                <Wallet className="w-3.5 h-3.5 text-stone-400" />
                Sizning balansingiz
              </span>
              <p className="font-serif text-base sm:text-lg font-bold text-stone-800">
                {formatUZS(currentBalance)}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Bob muvaffaqiyatli ochildi! Mutolaa yuklanmoqda...</span>
          </div>
        )}

        {/* Purchase Confirmation Box */}
        {showConfirm && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-left space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-serif font-bold text-stone-900">
                Xaridni tasdiqlash
              </span>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Kontent:</span>
                <span className="font-bold text-stone-900">{chapterTitle}</span>
              </div>
              <div className="flex justify-between">
                <span>To‘lov summasi:</span>
                <span className="font-bold text-amber-900">{formatUZS(price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Qoladigan balans:</span>
                <span className="font-bold text-stone-800">{formatUZS(remainingBalance)}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmUnlock}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Ochilmoqda...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tasdiqlash va xarid qilish</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition-colors min-h-[44px]"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isLoggedIn ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/kirish?redirect=/asarlar`}
              className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <span>Kirish yoki Ro‘yxatdan o‘tish</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : hasEnoughBalance ? (
          !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={loading || success}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 min-h-[44px]"
            >
              <span>Balansdan ochish ({formatUZS(price)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200/90 p-3.5 rounded-2xl text-left">
              Balansingizda mablag‘ yetarli emas (yetishmayotgan summa:{' '}
              <strong className="font-bold">{formatUZS(price - currentBalance)}</strong>).
              Quyidagi tugma orqali ma’mur bilan bog‘lanib hisobingizni to‘ldirishingiz mumkin.
            </div>

            <button
              id="paywall-topup-btn"
              type="button"
              onClick={() => setShowTopupModal(true)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all min-h-[44px]"
            >
              <Wallet className="w-4 h-4 text-stone-950" />
              <span>Hisobni to‘ldirish</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Top-up Modal */}
      <TopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        userBalance={currentBalance}
        userName={profile?.display_name || 'Foydalanuvchi'}
        publicId={profile?.public_id || 'MB-00000000'}
        userEmail={user?.email}
        targetItem={{
          title: chapterTitle,
          price,
          type: 'chapter',
        }}
      />
    </>
  );
}
