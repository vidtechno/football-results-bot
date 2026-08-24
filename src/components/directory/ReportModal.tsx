'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, CheckCircle2, Loader2 } from 'lucide-react';

interface ReportModalProps {
  organizationId: number;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({
  organizationId,
  organizationName,
  isOpen,
  onClose,
}: ReportModalProps) {
  const [reportType, setReportType] = useState<'wrong_phone' | 'wrong_address' | 'closed' | 'other'>('wrong_phone');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Iltimos, xatolik mazmunini kiriting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          report_type: reportType,
          message: message.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Xatolikni yuborishda muammo yuz berdi. Qayta urinib ko‘ring.');
      }
    } catch {
      setError('Server bilan aloqa uzildi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Rahmat!</h3>
            <p className="text-sm text-slate-600">
              Xabaringiz qabul qilindi. Operatorlarimiz ma’lumotni tez orada tekshirib chiqadi.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
            >
              Yopish
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-amber-600 font-bold text-base border-b border-slate-100 pb-3">
              <AlertTriangle className="w-5 h-5" />
              <span>Ma’lumot noto‘g‘ri?</span>
            </div>

            <p className="text-xs text-slate-500">
              <strong>{organizationName}</strong> sahifasidagi qaysi ma’lumotda xatolik sezasiz?
            </p>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xatolik turi
                </label>
                <select
                  value={reportType}
                  onChange={(e: any) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-sky-500"
                >
                  <option value="wrong_phone">Telefon raqami noto‘g‘ri</option>
                  <option value="wrong_address">Manzil noto‘g‘ri</option>
                  <option value="closed">Tashkilot faoliyati tugatilgan</option>
                  <option value="other">Boshqa xatolik</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tafsilotlar
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="To‘g‘ri ma’lumot yoki xatolik haqida izoh qoldiring..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Yuborish</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
