'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { Flag, CheckCircle2, Clock, ExternalLink, Edit3, MessageSquare, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface ReportsModerationClientProps {
  initialReports: any[];
}

export function ReportsModerationClient({ initialReports }: ReportsModerationClientProps) {
  const [reports, setReports] = useState<any[]>(initialReports);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const handleUpdateStatus = async (status: 'pending' | 'reviewed' | 'resolved') => {
    if (!selectedReport) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReport.id,
          status,
          internal_notes: notes,
        }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === selectedReport.id ? { ...r, status, internal_notes: notes } : r)),
        );
        setSelectedReport(null);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold pb-2">
        {(['all', 'pending', 'reviewed', 'resolved'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl transition-all capitalize',
              filterStatus === st
                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
            )}
          >
            {st === 'all' && `Barchasi (${reports.length})`}
            {st === 'pending' && `Yangi Kutilayotgan (${reports.filter((r) => r.status === 'pending').length})`}
            {st === 'reviewed' && `Ko‘rib Chiqilayotgan (${reports.filter((r) => r.status === 'reviewed').length})`}
            {st === 'resolved' && `Hal Qilingan (${reports.filter((r) => r.status === 'resolved').length})`}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 font-medium">
            Hisobotlar topilmadi
          </div>
        ) : (
          filtered.map((report) => {
            const org = report.organization;

            return (
              <div key={report.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <OrganizationAvatar name={org?.name || 'Tashkilot'} logoUrl={org?.logo_url} size="sm" />
                    <div>
                      <strong className="text-sm font-black text-slate-900 block">{org?.name || 'Tashkilot'}</strong>
                      <span className="text-[11px] text-slate-500 font-medium">{org?.category?.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                        report.status === 'pending'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : report.status === 'reviewed'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {report.status === 'pending' ? 'Yangi xabar' : report.status === 'reviewed' ? 'Tekshirilmoqda' : 'Hal qilindi'}
                    </span>

                    {org && (
                      <Link
                        href={`/diyoration/organizations/${org.id}`}
                        className="px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Foydalanuvchi Xabari:</span>
                  <p className="text-xs text-slate-800 font-semibold p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 leading-relaxed">
                    “{report.message}”
                  </p>
                </div>

                {report.internal_notes && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 font-medium">
                    <strong>Ichki moderator izohi:</strong> {report.internal_notes}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                  <span>Yuborilgan vaqti: {formatUzbekDate(report.created_at)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReport(report);
                      setNotes(report.internal_notes || '');
                    }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Status va izohni o‘zgartirish
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Moderation Action Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">Xabarnoma Moderatsiyasi</h3>

            <p className="text-xs text-slate-600 font-medium">
              “{selectedReport.organization?.name}” bo‘yicha kelib tushgan xabar holatini o‘zgartirish:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ichki izoh / Eslatma</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masalan: Telefon raqami tekshirilib, yangilandi."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Yopish
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleUpdateStatus('reviewed')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm"
              >
                Tekshirilmoqda
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleUpdateStatus('resolved')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Hal qilindi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
