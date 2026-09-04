'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  Eye,
  ExternalLink,
  DollarSign,
  Clock,
  X,
  Loader2,
  Lock,
  Unlock,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';

export default function AdminWorksManagementPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Work for Detail Drawer
  const [selectedWork, setSelectedWork] = useState<any | null>(null);

  // Action Dialog
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'unpublish' | 'archive' | 'restore';
    workId: string;
    title: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWorks = useCallback(async (q: string, status: string, access: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/works?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&access=${encodeURIComponent(access)}`
      );
      const data = await res.json();
      if (data.success) {
        setWorks(data.works || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorks(searchQuery, statusFilter, accessFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWorks, statusFilter, accessFilter]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchWorks(val, statusFilter, accessFilter);
    }, 300);
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionError(null);

    if (
      (actionModal.type === 'reject' || actionModal.type === 'unpublish') &&
      !reasonInput.trim()
    ) {
      setActionError('Sababni ko‘rsatish majburiy');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: actionModal.workId,
          action: actionModal.type,
          rejectionReason: reasonInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Amalni bajarishda xatolik yuz berdi');
      }

      setActionModal(null);
      setReasonInput('');
      fetchWorks(searchQuery, statusFilter, accessFilter);
      if (selectedWork?.id === actionModal.workId) {
        setSelectedWork(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'Xatolik yuz berdi');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <span>Asarlar va Boblar Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Barcha kitoblar, seriallar, boblar moderatsiyasi, narxlar va xaridlar nazorati
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black">
            Jami: {works.length} ta asar
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Asar nomi, muallif yoki ID bo‘yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {/* Status filters */}
            {[
              { id: 'all', label: 'Barcha holatlar' },
              { id: 'pending_review', label: 'Kutilayotgan' },
              { id: 'published', label: 'Nashr qilingan' },
              { id: 'draft', label: 'Qoralama' },
              { id: 'rejected', label: 'Rad etilgan' },
              { id: 'archived', label: 'Arxivlangan' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Works Listing */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Asarlar yuklanmoqda...</span>
          </div>
        ) : works.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Hech qanday asar topilmadi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {works.map((w) => {
              const isPublished = w.status === 'published';
              const isPending = w.status === 'pending_review';
              const isArchived = w.status === 'archived';

              return (
                <div key={w.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                      {w.cover_url ? (
                        <Image src={w.cover_url} alt={w.title} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 font-serif font-black text-sm">
                          M
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm sm:text-base font-serif font-bold text-slate-900">
                          {w.title}
                        </strong>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isPublished
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-900'
                              : isArchived
                              ? 'bg-stone-200 text-stone-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPublished
                            ? 'Nashr qilingan'
                            : isPending
                            ? 'Kutilmoqda'
                            : isArchived
                            ? 'Arxivlangan'
                            : w.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>Muallif: <strong className="text-slate-800">{w.author_name}</strong></span>
                        <span>•</span>
                        <span>{w.chapters?.length || 0} ta bob</span>
                        <span>•</span>
                        <span>
                          {w.access_type === 'free'
                            ? 'Bepul'
                            : w.access_type === 'paid_full_work'
                            ? `To‘liq asar: ${formatUZS(w.full_work_price)}`
                            : 'Bobma-bob to‘lov'}
                        </span>
                      </div>

                      {/* Sales Stats (Private metadata summary) */}
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Xaridlar: {w.sales_count} ta ({formatUZS(w.sales_revenue)})
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ID: {w.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedWork(w)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-2xs hover:bg-slate-800 min-h-[40px]"
                    >
                      Batafsil
                    </button>

                    {isPublished && (
                      <Link
                        href={`/asarlar/${w.slug}`}
                        target="_blank"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Saytda ko‘rish"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal({ isOpen: true, type: 'approve', workId: w.id, title: w.title })}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px]"
                        >
                          Nashr qilish
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionModal({ isOpen: true, type: 'reject', workId: w.id, title: w.title });
                            setReasonInput('');
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs min-h-[40px]"
                        >
                          Rad etish
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Work Details Drawer */}
      {selectedWork && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="absolute inset-0" onClick={() => setSelectedWork(null)} />

          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base leading-tight">
                    {selectedWork.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Muallif: {selectedWork.author_name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWork(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Cover and Specs */}
              <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="relative w-20 h-28 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-xs">
                  {selectedWork.cover_url ? (
                    <Image src={selectedWork.cover_url} alt={selectedWork.title} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-serif font-black">
                      M
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block ${
                      selectedWork.status === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedWork.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {selectedWork.status}
                  </span>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Kirish turi (Pricing):</span>
                    <strong className="text-slate-800">
                      {selectedWork.access_type === 'free'
                        ? 'Bepul'
                        : selectedWork.access_type === 'paid_full_work'
                        ? `To‘liq asar: ${formatUZS(selectedWork.full_work_price)}`
                        : 'Bobma-bob sotiladi'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Umumiy xaridlar:</span>
                    <span className="font-bold text-emerald-700">
                      {selectedWork.sales_count} ta xarid ({formatUZS(selectedWork.sales_revenue)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Administrative Actions */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Moderatsiya Amallari
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedWork.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionModal({ isOpen: true, type: 'unpublish', workId: selectedWork.id, title: selectedWork.title });
                        setReasonInput('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Nashrdan olish (Qoralamaga qaytarish)</span>
                    </button>
                  )}

                  {selectedWork.status === 'published' && (
                    <button
                      type="button"
                      onClick={() => setActionModal({ isOpen: true, type: 'archive', workId: selectedWork.id, title: selectedWork.title })}
                      className="px-3.5 py-2 rounded-xl bg-stone-700 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arxivlash</span>
                    </button>
                  )}

                  {selectedWork.status === 'archived' && (
                    <button
                      type="button"
                      onClick={() => setActionModal({ isOpen: true, type: 'restore', workId: selectedWork.id, title: selectedWork.title })}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Arxivdan chiqarish va nashr qilish</span>
                    </button>
                  )}

                  {selectedWork.status === 'pending_review' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'approve', workId: selectedWork.id, title: selectedWork.title })}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px]"
                      >
                        Tasdiqlash va nashr qilish
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionModal({ isOpen: true, type: 'reject', workId: selectedWork.id, title: selectedWork.title });
                          setReasonInput('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs min-h-[40px]"
                      >
                        Rad etish
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedWork.description && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Asar tavsifi
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    {selectedWork.description}
                  </p>
                </div>
              )}

              {/* Chapters List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Boblar ro‘yxati ({selectedWork.chapters?.length || 0})
                </span>

                {selectedWork.chapters?.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                    Hali boblar qo‘shilmagan.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {selectedWork.chapters.map((ch: any) => (
                      <div key={ch.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 font-mono text-slate-400 font-bold text-[11px]">
                            {ch.chapter_number}.
                          </span>
                          <div>
                            <strong className="font-serif font-bold text-slate-900 block">{ch.title}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {ch.id.slice(0, 8)}...</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ch.is_free ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Unlock className="w-3 h-3" />
                              <span>Bepul</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-800 font-bold text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Lock className="w-3 h-3" />
                              <span>{formatUZS(ch.price)}</span>
                            </span>
                          )}

                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {ch.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-black text-slate-900 text-base">
              {actionModal.type === 'approve'
                ? 'Asarni nashr qilish'
                : actionModal.type === 'reject'
                ? 'Asarni rad etish'
                : actionModal.type === 'unpublish'
                ? 'Asarni nashrdan olish (qoralamaga)'
                : actionModal.type === 'archive'
                ? 'Asarni arxivlash'
                : 'Arxivdan chiqarish'}
            </h3>

            <p className="text-xs text-slate-600">
              Asar: <strong>{actionModal.title}</strong>
            </p>

            {(actionModal.type === 'reject' || actionModal.type === 'unpublish') && (
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Majburiy sabab: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Muallifga yuboriladigan sababni kiriting..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px]"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tasdiqlash'}
              </button>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs min-h-[44px]"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
