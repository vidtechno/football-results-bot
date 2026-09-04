'use client';

import React, { useState } from 'react';
import {
  X,
  Wallet,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPublicId: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 200000, 500000];

export function TopupModal({
  isOpen,
  onClose,
  userPublicId,
  onSuccess,
}: TopupModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequest, setCreatedRequest] = useState<{
    id: string;
    amount: number;
    telegramUrl: string;
    messageText: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;

  async function handleCreateTopup() {
    if (currentAmount < 1000) {
      setError("Minimal to‘lov miqdori: 1 000 so'm");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: currentAmount }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'So‘rov yaratishda xatolik yuz berdi');
      }

      const telegramMsg = `Assalomu alaykum! Manbora hisobimni to‘ldirmoqchiman:\n\n👤 Manbora ID: ${userPublicId}\n🧾 So‘rov ID: ${data.requestId}\n💰 Summa: ${formatUZS(data.amount)}`;
      const encodedMsg = encodeURIComponent(telegramMsg);
      const telegramUrl = `https://t.me/diyorbek_anorboyev?text=${encodedMsg}`;

      setCreatedRequest({
        id: data.requestId,
        amount: data.amount,
        telegramUrl,
        messageText: telegramMsg,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyMessage() {
    if (!createdRequest) return;
    navigator.clipboard.writeText(createdRequest.messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {!createdRequest ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  Hisobni to‘ldirish
                </h3>
                <p className="text-xs text-slate-500">
                  Manbora ID: <strong>{userPublicId}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              O‘zingizga mos summani tanlang. So‘rov yaratilgach, administratorga Telegram orqali chekni yuborasiz va balansingiz tasdiqlanadi.
            </p>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className={`py-3 px-2 rounded-2xl border text-xs font-black transition-all ${
                    !customAmount && selectedAmount === amt
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {formatUZS(amt)}
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Yoki boshqa summa (so‘mda):
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                placeholder="Masalan: 75 000"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-sm font-bold text-slate-900"
              />
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCreateTopup}
              disabled={loading || currentAmount <= 0}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>So‘rov yaratilmoqda...</span>
                </>
              ) : (
                <>
                  <span>Davom etish ({formatUZS(currentAmount)})</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center pt-2">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">
              So‘rov qabul qilindi!
            </h3>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed max-w-sm mx-auto">
              To‘lovni amalga oshirish va chekni yuborish uchun quyidagi Telegram tugmasini bosing.
            </p>

            {/* Request Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">So‘rov ID:</span>
                <span className="font-mono font-bold text-slate-800 truncate max-w-[200px]">
                  {createdRequest.id}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kiritilgan summa:</span>
                <span className="font-black text-blue-600 text-sm">
                  {formatUZS(createdRequest.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Qabul qiluvchi:</span>
                <span className="font-bold text-slate-800">@diyorbek_anorboyev</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <a
                href={createdRequest.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-[#229ED9] hover:bg-[#1e8cc1] text-white font-black text-sm shadow-md shadow-[#229ED9]/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Telegram orqali chekni yuborish</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={handleCopyMessage}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Nusxalandi!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>Xabar matnidan nusxa olish</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
              Administrator to‘lov kvitansiyasini tasdiqlaganidan so‘ng, summa avtomatik ravishda balansingizga qo‘shiladi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
