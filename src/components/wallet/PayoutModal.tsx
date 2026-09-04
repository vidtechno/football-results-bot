'use client';

import React, { useState } from 'react';
import { X, CreditCard, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { formatUZS, isValidCardNumber } from '@/lib/utils/currency';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableEarnings: number;
  onSuccess?: () => void;
}

export function PayoutModal({
  isOpen,
  onClose,
  availableEarnings,
  onSuccess,
}: PayoutModalProps) {
  const [amount, setAmount] = useState<string>(
    availableEarnings >= 100000 ? String(availableEarnings) : '100000',
  );
  const [legalName, setLegalName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [authorNote, setAuthorNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  function handleCardChange(val: string) {
    // Only numbers
    const clean = val.replace(/\D/g, '').slice(0, 16);
    // Format into 4-digit groups
    const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);

    if (numAmount < 100000) {
      setError("Minimal yechib olish summasi: 100 000 so'm");
      return;
    }

    if (numAmount > availableEarnings) {
      setError(`Mavjud daromadingizdan (${formatUZS(availableEarnings)}) ortiq summa yechib bo'lmaydi`);
      return;
    }

    if (!legalName.trim()) {
      setError('To‘liq ism-sharifingizni kiriting');
      return;
    }

    if (!isValidCardNumber(cardNumber)) {
      setError('Karta raqami 16 ta raqamdan iborat bo‘lishi shart');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          legalName: legalName.trim(),
          cardNumber: cardNumber.replace(/\s+/g, ''),
          authorNote: authorNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Pul yechish so‘rovida xatolik yuz berdi');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          aria-label="Yopish"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              So‘rov muvaffaqiyatli yuborildi!
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Mablag‘ zaxiraga olindi. Administrator to‘lovni amalga oshirgach, chek muallif kabinetingizda aks etadi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Pul yechib olish
                </h3>
                <p className="text-xs text-slate-500">
                  Mavjud daromad: <strong className="text-emerald-600 font-bold">{formatUZS(availableEarnings)}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Minimal yechib olish miqdori <strong>100 000 so‘m</strong>. Karta ma’lumotlaringiz xavfsiz tarzda saqlanadi.
            </p>

            <div className="space-y-4 mb-6">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Yechib olinadigan summa (so‘m):
                </label>
                <input
                  type="number"
                  min="100000"
                  max={availableEarnings}
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm font-bold text-slate-900"
                  required
                />
              </div>

              {/* Legal Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Karta egasining to‘liq ismi (F.I.O):
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Abdullayev Diyorbek"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm font-medium text-slate-900"
                  required
                />
              </div>

              {/* Card Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bank karta raqami (Uzcard / Humo):
                </label>
                <input
                  type="text"
                  placeholder="8600 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm font-mono font-bold tracking-wider text-slate-900"
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Qo‘shimcha izoh (ixtiyoriy):
                </label>
                <input
                  type="text"
                  placeholder="Admin uchun eslatma"
                  value={authorNote}
                  onChange={(e) => setAuthorNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm text-slate-900"
                />
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || availableEarnings < 100000}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>So‘rov yuborilmoqda...</span>
                </>
              ) : (
                <span>So‘rovni yuborish ({formatUZS(amount)})</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
