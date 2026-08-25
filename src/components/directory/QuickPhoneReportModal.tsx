'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Phone, Loader2 } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils/formatters';

interface QuickPhoneReportModalProps {
  organizationId: number;
  organizationName: string;
  phoneNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickPhoneReportModal({
  organizationId,
  organizationName,
  phoneNumber,
  isOpen,
  onClose,
}: QuickPhoneReportModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const phoneObj = formatPhoneNumber(phoneNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          report_type: 'contact_issue',
          target_contact: phoneNumber,
          message: reason.trim() || `Raqam ishlamayapti yoki javob bermayapti: ${phoneNumber}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Xabar yuborishda xatolik yuz berdi');
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setReason('');
        onClose();
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Xatolik yuz berdi. Qayta urinib ko‘ring.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">Raqam ishlamayaptimi?</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{organizationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 py-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-extrabold text-emerald-900">Rahmat! Xabar qabul qilindi.</p>
            <p className="text-xs text-emerald-700 font-medium">Administratorlar raqamni tez orada tekshirib ko‘rishadi.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-extrabold text-slate-900">{phoneObj.display}</span>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {errorMsg}
              </p>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sabab yoki izoh (ixtiyoriy)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Masalan: Band bermayapti, o‘chirilgan yoki boshqa tashkilotga tegishli..."
                rows={2}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors min-h-[44px]"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold hover:bg-amber-700 active:scale-95 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Yuborilmoqda...</span>
                  </>
                ) : (
                  <span>Xabar berish</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
