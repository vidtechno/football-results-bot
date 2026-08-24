'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { PlusCircle, CheckCircle2, XCircle, Building2, Phone, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SuggestionsModerationClientProps {
  initialSuggestions: any[];
}

export function SuggestionsModerationClient({ initialSuggestions }: SuggestionsModerationClientProps) {
  const [suggestions, setSuggestions] = useState<any[]>(initialSuggestions);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const filtered = suggestions.filter((s) => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  const handleAction = async (id: number, action: 'accept' | 'reject', convertToOrg: boolean = true) => {
    setLoadingId(id);

    try {
      const res = await fetch('/api/admin/suggestions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, convert_to_org: convertToOrg }),
      });

      if (res.ok) {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: action === 'accept' ? 'accepted' : 'rejected' } : s)),
        );
      }
    } catch {
      // ignore
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold pb-2">
        {(['pending', 'all', 'accepted', 'rejected'] as const).map((st) => (
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
            {st === 'pending' && `Kutilayotgan (${suggestions.filter((s) => s.status === 'pending').length})`}
            {st === 'all' && `Barchasi (${suggestions.length})`}
            {st === 'accepted' && `Qabul qilingan (${suggestions.filter((s) => s.status === 'accepted').length})`}
            {st === 'rejected' && `Rad etilgan (${suggestions.filter((s) => s.status === 'rejected').length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-400 font-medium">
            Takliflar topilmadi
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{item.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                    <span>{item.category?.name || 'Kategoriyasiz'}</span>
                    <span>•</span>
                    <span>{item.region?.name || 'Hududsiz'}</span>
                    {item.city_district && (
                      <>
                        <span>•</span>
                        <span className="text-slate-700 font-bold">{item.city_district}</span>
                      </>
                    )}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                    item.status === 'pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : item.status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {item.status === 'pending' ? 'Kutilmoqda' : item.status === 'accepted' ? 'Qabul qilindi' : 'Rad etildi'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-slate-700">
                {item.phone_number && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold block">Telefon:</span>
                    <strong className="text-slate-900 font-mono">{item.phone_number}</strong>
                  </div>
                )}

                {item.website_url && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold block">Sayt:</span>
                    <a href={item.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono truncate block">
                      {item.website_url}
                    </a>
                  </div>
                )}

                {item.source_url && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold block">Manba URL:</span>
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-mono truncate block">
                      {item.source_url}
                    </a>
                  </div>
                )}
              </div>

              {item.note && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                  <strong className="text-slate-500 font-bold block mb-0.5">Qo‘shimcha izoh:</strong>
                  “{item.note}”
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium pt-2 border-t border-slate-100">
                <span>Kelib tushgan sana: {formatUzbekDate(item.created_at)}</span>

                {item.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => handleAction(item.id, 'reject', false)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200"
                    >
                      Rad etish
                    </button>

                    <button
                      type="button"
                      disabled={loadingId === item.id}
                      onClick={() => handleAction(item.id, 'accept', true)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5"
                    >
                      {loadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Qabul qilish & Reestrga Yaratish</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
