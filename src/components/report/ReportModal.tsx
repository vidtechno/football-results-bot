'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'work' | 'chapter' | 'review' | 'author';
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  'Mualliflik huquqining buzilishi (plagiat)',
  'Haqoratomuz yoki nojo‘ya so‘zlar',
  'Spam yoki noto‘g‘ri ma’lumot',
  'Taqiqlangan yoki qonunga zid kontent',
  'Boshqa sabab',
];

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}: ReportModalProps) {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = `/kirish?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 1800);
      } else {
        setError(data.error || 'Shikoyatni yuborishda xatolik');
      }
    } catch {
      setError('Server bilan aloqa uzildi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-stone-900 font-serif font-bold text-base">
            <Flag className="w-5 h-5 text-rose-600" />
            <span>Shikoyat bildirish</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-stone-900 text-base">Shikoyatingiz qabul qilindi</h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Moderatsiya jamoasi ushbu murojaatni qisqa vaqt ichida ko‘rib chiqadi. Rahmat!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {targetTitle && (
              <p className="text-xs text-stone-500 truncate">
                Obyekt: <strong className="text-stone-800">{targetTitle}</strong>
              </p>
            )}

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {error}
              </div>
            )}

            {/* Reasons dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Shikoyat sababi:</label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs text-stone-800"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Qo‘shimcha tafsilotlar (ixtiyoriy):</label>
              <textarea
                rows={3}
                placeholder="Qoidabuzarlik yoki muammo haqida batafsil ma’lumot..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs text-stone-800"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                <span>Yuborish</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
