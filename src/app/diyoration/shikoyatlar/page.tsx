'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Flag, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved' | 'dismissed'>('pending');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      const data = await res.json();
      if (data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleAction = async (reportId: string, action: 'resolved' | 'dismissed') => {
    setActionLoadingId(reportId);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (data.success) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: action, resolved_at: new Date().toISOString() } : r))
        );
      }
    } catch (err) {
      console.error('Action error:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredReports = reports.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 flex items-center gap-2.5">
            <Flag className="w-6 h-6 text-rose-600" />
            <span>Foydalanuvchilar shikoyatlari</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Kitobxonlar tomonidan asar, bob, muallif yoki taqrizlar ustidan yuborilgan shikoyatlar
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl text-xs font-bold">
          {[
            { id: 'pending', label: 'Kutilmoqda' },
            { id: 'resolved', label: 'Hal qilingan' },
            { id: 'dismissed', label: 'Rad etilgan' },
            { id: 'all', label: 'Barchasi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                filter === tab.id ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Yuklanmoqda...</div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
          Ushbu statusda hech qanday shikoyat mavjud emas.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-bold uppercase text-[10px]">
                    {report.target_type === 'work'
                      ? 'Asar'
                      : report.target_type === 'chapter'
                      ? 'Bob'
                      : report.target_type === 'review'
                      ? 'Taqriz'
                      : 'Muallif'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                      report.status === 'pending'
                        ? 'bg-amber-100 text-amber-900'
                        : report.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {report.status === 'pending'
                      ? 'Kutilmoqda'
                      : report.status === 'resolved'
                      ? 'Hal qilingan'
                      : 'Rad etilgan'}
                  </span>
                </div>
                <span className="text-stone-400 text-[11px]">{formatUzbekDate(report.created_at)}</span>
              </div>

              <div>
                <h4 className="font-serif font-bold text-stone-900 text-sm">{report.reason}</h4>
                {report.details && (
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed bg-[#FAF8F5] p-3 rounded-2xl border border-stone-200">
                    {report.details}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
                <div className="text-stone-500">
                  Yuboruvchi: <strong className="text-stone-800">{report.reporter?.display_name || 'Foydalanuvchi'}</strong> ({report.reporter?.email || ''})
                </div>

                {report.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(report.id, 'dismissed')}
                      disabled={actionLoadingId === report.id}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5 text-stone-500" />
                      <span>Rad etish</span>
                    </button>
                    <button
                      onClick={() => handleAction(report.id, 'resolved')}
                      disabled={actionLoadingId === report.id}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      {actionLoadingId === report.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Hal qilindi</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
