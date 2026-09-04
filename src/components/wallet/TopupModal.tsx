'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Wallet,
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import {
  generateTelegramTopupMessage,
  getAdminTelegramUrl,
  getAdminTelegramUsername,
} from '@/lib/utils/telegram';

export interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance?: number;
  userName?: string;
  publicId?: string;
  userEmail?: string | null;
  targetItem?: {
    title: string;
    price: number;
    type: 'work' | 'chapter';
  } | null;
}

const PRESET_AMOUNTS = [10000, 20000, 50000, 100000];

export function TopupModal({
  isOpen,
  onClose,
  userBalance = 0,
  userName = 'Foydalanuvchi',
  publicId = 'MB-00000000',
  userEmail,
  targetItem,
}: TopupModalProps) {
  const missingAmount = targetItem ? Math.max(0, targetItem.price - userBalance) : 0;
  const initialAmount = missingAmount > 0 ? missingAmount : 20000;

  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmountStr, setCustomAmountStr] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const effectiveAmount = useMemo(() => {
    if (customAmountStr) {
      const parsed = parseInt(customAmountStr.replace(/\D/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedAmount;
  }, [customAmountStr, selectedAmount]);

  const telegramMessage = useMemo(() => {
    return generateTelegramTopupMessage({
      userName,
      publicId,
      email: userEmail,
      currentBalance: userBalance,
      itemTitle: targetItem?.title,
      itemType: targetItem?.type,
      itemPrice: targetItem?.price,
      missingAmount: missingAmount > 0 ? missingAmount : undefined,
      requestedAmount: effectiveAmount > 0 ? effectiveAmount : undefined,
    });
  }, [
    userName,
    publicId,
    userEmail,
    userBalance,
    targetItem,
    missingAmount,
    effectiveAmount,
  ]);

  const telegramUrl = useMemo(() => {
    return getAdminTelegramUrl(telegramMessage);
  }, [telegramMessage]);

  const adminUsername = getAdminTelegramUsername();

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(telegramMessage);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = telegramMessage;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      id="topup-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm transition-opacity"
      style={{ height: '100dvh' }}
    >
      {/* Modal Card / Bottom Sheet */}
      <div
        className="relative w-full max-w-[620px] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)] md:max-h-[calc(100dvh-48px)] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 bg-[#FAF8F5] shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <Wallet className="w-5 h-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h2 id="topup-modal-title" className="text-base font-serif font-bold text-stone-900 leading-tight truncate">
                Hisobni to‘ldirish
              </h2>
              <span className="text-[11px] text-stone-500 font-medium block truncate">
                Telegram orqali xavfsiz qo‘lda to‘lov
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] shrink-0 ml-2"
            aria-label="Yopish"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Independently Scrollable Body with min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Item & Balance Breakdown (if opened with an item) */}
          {targetItem ? (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Tanlangan {targetItem.type === 'chapter' ? 'bob' : 'asar'}
                  </span>
                  <p className="font-serif font-bold text-stone-900 text-sm mt-0.5 line-clamp-1">
                    {targetItem.title}
                  </p>
                </div>
                <span className="font-serif font-bold text-stone-900 text-sm">
                  {formatUZS(targetItem.price)}
                </span>
              </div>

              <div className="pt-2 border-t border-amber-200/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 font-medium">Joriy balans:</span>
                  <p className="font-bold text-stone-800">{formatUZS(userBalance)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-amber-800 font-bold">Yetishmayotgan:</span>
                  <p className="font-bold text-amber-900 text-sm">
                    {formatUZS(missingAmount)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* General Balance & Target Amount Selector */
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">Joriy balansingiz:</span>
                <span className="font-serif font-bold text-stone-900 text-sm">
                  {formatUZS(userBalance)}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1.5">
                  To‘ldirish summasini tanlang yoki kiriting:
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmountStr('');
                      }}
                      className={`py-2 px-1 rounded-xl text-center text-xs font-bold border transition-all min-h-[44px] ${
                        selectedAmount === amt && !customAmountStr
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Boshqa summa (so‘mda)"
                  value={customAmountStr}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setCustomAmountStr(raw ? `${Number(raw).toLocaleString('uz-UZ')} so'm` : '');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 min-h-[44px]"
                />
              </div>
            </div>
          )}

          {/* User Manbora ID Banner */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block">
                Sizning Manbora ID
              </span>
              <p className="font-mono font-black text-amber-900 text-sm mt-0.5">
                {publicId}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tasdiqlangan hisob</span>
            </span>
          </div>

          {/* 6 Step-by-Step Instructions */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5 font-serif">
              <HelpCircle className="w-4 h-4 text-amber-700" />
              <span>To‘ldirish tartibi (6 bosqich):</span>
            </h4>

            <ol className="space-y-2 text-stone-600 text-[11px] sm:text-xs">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  1
                </span>
                <span>Telegram orqali ma’murga tayyor xabarni yuboring.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  2
                </span>
                <span>Ma’mur sizga to‘lov uchun karta raqamini yuboradi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  3
                </span>
                <span>Kerakli summani kartaga o‘tkazing.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  4
                </span>
                <span>To‘lov chekini Telegram orqali ma’murga yuboring.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  5
                </span>
                <span>Ma’mur to‘lovni tekshirgach, saytdagi balansingizni to‘ldiradi.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                  6
                </span>
                <span className="font-semibold text-stone-800">
                  Balans to‘ldirilgach, ushbu asarni sotib olishingiz mumkin.
                </span>
              </li>
            </ol>
          </div>

          {/* Collapsible Message Preview */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowFullPreview(!showFullPreview)}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-900 hover:underline"
            >
              {showFullPreview ? 'Xabar matnini yashirish' : 'Tayyor xabar matnini ko‘rish'}
            </button>

            {showFullPreview && (
              <div className="mt-2 p-3 rounded-xl bg-stone-100/90 border border-stone-200 text-stone-700 text-[11px] font-mono whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
                {telegramMessage}
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div
          className="p-4 sm:p-5 border-t border-stone-100 bg-[#FAF8F5] shrink-0 sticky bottom-0 z-20 space-y-2.5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Primary Telegram CTA */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all min-h-[44px]"
            >
              <Send className="w-4 h-4 text-stone-950 shrink-0" />
              <span className="whitespace-nowrap">Telegram orqali yozish</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5 shrink-0" />
            </a>

            {/* Copy Fallback Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all min-h-[44px] shrink-0 ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-stone-300 hover:bg-stone-50 text-stone-800'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="whitespace-nowrap">Xabar nusxalandi!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500 shrink-0" />
                  <span className="whitespace-nowrap">Xabarni nusxalash</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-stone-400 text-center">
            Ma’mur Telegram profili: <span className="font-semibold text-stone-600">@{adminUsername}</span>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
