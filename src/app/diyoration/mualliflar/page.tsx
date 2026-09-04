'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PenTool,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  BookOpen,
  DollarSign,
  ShieldCheck,
  X,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';

export default function AdminAuthorsManagementPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Author Detail Drawer
  const [selectedAuthor, setSelectedAuthor] = useState<any | null>(null);
  const [authorDetails, setAuthorDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Action Dialogs
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'suspend' | 'restore' | 'note';
    authorId: string;
    penName: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAuthors = useCallback(async (q: string, filter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/authors?q=${encodeURIComponent(q)}&status=${encodeURIComponent(filter)}`);
      const data = await res.json();
      if (data.success) {
        setAuthors(data.authors || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors(searchQuery, activeFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAuthors, activeFilter]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchAuthors(val, activeFilter);
    }, 300);
  };

  const openAuthorDrawer = async (author: any) => {
    setSelectedAuthor(author);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${author.user_id}`);
      const data = await res.json();
      if (data.success && data.user) {
        setAuthorDetails(data.user);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setActionError(null);

    if (
      (actionModal.type === 'reject' || actionModal.type === 'suspend') &&
      !reasonInput.trim()
    ) {
      setActionError('Sababni ko‘rsatish majburiy');
      return;
    }

    if (actionModal.type === 'note' && !reasonInput.trim()) {
      setActionError('Izoh matni bo‘sh bo‘lishi mumkin emas');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/author-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: actionModal.authorId,
          action: actionModal.type,
          rejectionReason: reasonInput.trim(),
          note: reasonInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Amalni bajarishda xatolik yuz berdi');
      }

      setActionModal(null);
      setReasonInput('');
      fetchAuthors(searchQuery, activeFilter);
      if (selectedAuthor) {
        openAuthorDrawer(selectedAuthor);
      }
    } catch (err: any) {
      setActionError(err.message || 'Xatolik yuz berdi');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <PenTool className="w-8 h-8 text-amber-600" />
            <span>Mualliflar Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Mualliflik arizalari, tasdiqlangan ijodkorlar, cheklovlar va mualliflik hamyonlari nazorati
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
            Jami: {authors.length} nafar muallif
          </span>
        </div>
      </div>

      {/* Search and Filter bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Taxallus, ism, Manbora ID yoki email bo‘yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'pending', label: 'Kutilayotgan' },
              { id: 'approved', label: 'Tasdiqlangan' },
              { id: 'suspended', label: 'Cheklangan' },
              { id: 'rejected', label: 'Rad etilgan' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                  activeFilter === f.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Authors List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>Mualliflar yuklanmoqda...</span>
          </div>
        ) : authors.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Hech qanday muallif arizasi yoki hisobi topilmadi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {authors.map((a) => {
              const isPending = a.status === 'pending';
              const isApproved = a.status === 'approved';
              const isSuspended = a.status === 'suspended';
              const isRejected = a.status === 'rejected';

              return (
                <div key={a.user_id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-950 flex items-center justify-center font-serif font-black text-sm shrink-0 border border-amber-200">
                      {a.pen_name?.charAt(0).toUpperCase() || 'M'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm font-serif font-bold text-slate-900">
                          {a.pen_name}
                        </strong>
                        <span className="text-xs text-slate-500 font-medium">
                          ({a.display_name})
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-900'
                              : isSuspended
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isApproved
                            ? 'Tasdiqlangan'
                            : isPending
                            ? 'Kutilmoqda'
                            : isSuspended
                            ? 'Cheklangan'
                            : 'Rad etilgan'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="font-mono text-blue-900 font-bold">ID: {a.public_id}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-slate-500">{a.email}</span>
                        <span>•</span>
                        <span>{formatUzbekDate(a.created_at)}</span>
                      </div>

                      {a.biography && (
                        <p className="text-xs text-slate-600 mt-2 max-w-2xl line-clamp-2 leading-relaxed">
                          {a.biography}
                        </p>
                      )}

                      {a.rejection_reason && (
                        <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                          Sabab: {a.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => openAuthorDrawer(a)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-2xs hover:bg-slate-800 min-h-[40px]"
                    >
                      Tafsilotlar
                    </button>

                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal({ isOpen: true, type: 'approve', authorId: a.user_id, penName: a.pen_name })}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px]"
                        >
                          Tasdiqlash
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionModal({ isOpen: true, type: 'reject', authorId: a.user_id, penName: a.pen_name });
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

      {/* Author Details Drawer */}
      {selectedAuthor && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="absolute inset-0" onClick={() => setSelectedAuthor(null)} />

          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white font-serif font-black text-base flex items-center justify-center">
                  {selectedAuthor.pen_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-base leading-tight">
                    {selectedAuthor.pen_name}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {selectedAuthor.public_id} • {selectedAuthor.display_name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAuthor(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetails || !authorDetails ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Author Balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 block">
                      Yechib olish mumkin (Available)
                    </span>
                    <p className="font-serif text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                      {formatUZS(authorDetails.author?.balances?.available || 0)}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-stone-500 block">
                      Band qilingan (Reserved)
                    </span>
                    <p className="font-serif text-xl sm:text-2xl font-black text-stone-800 mt-1">
                      {formatUZS(authorDetails.author?.balances?.reserved || 0)}
                    </p>
                  </div>
                </div>

                {/* Management Action Bar */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Mualliflik Maqomi Boshqaruvi
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {selectedAuthor.status === 'approved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionModal({ isOpen: true, type: 'suspend', authorId: selectedAuthor.user_id, penName: selectedAuthor.pen_name });
                          setReasonInput('');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Nashr huquqini to‘xtatish</span>
                      </button>
                    )}

                    {selectedAuthor.status === 'suspended' && (
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'restore', authorId: selectedAuthor.user_id, penName: selectedAuthor.pen_name })}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Nashr huquqini qayta tiklash</span>
                      </button>
                    )}

                    {selectedAuthor.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => setActionModal({ isOpen: true, type: 'approve', authorId: selectedAuthor.user_id, penName: selectedAuthor.pen_name })}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px]"
                      >
                        Arizani tasdiqlash
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActionModal({ isOpen: true, type: 'note', authorId: selectedAuthor.user_id, penName: selectedAuthor.pen_name });
                        setReasonInput('');
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 min-h-[40px]"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      <span>Izoh qoldirish</span>
                    </button>
                  </div>
                </div>

                {/* Author Biography */}
                {selectedAuthor.biography && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                      Mualliflik biografiyasi
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {selectedAuthor.biography}
                    </p>
                  </div>
                )}

                {/* Authored Works */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Muallif asarlari ({authorDetails.author?.works?.length || 0})
                  </span>
                  {authorDetails.author?.works?.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                      Hozircha asarlar yaratilmagan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {authorDetails.author?.works?.map((w: any) => (
                        <div key={w.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <strong className="font-serif font-bold text-slate-900 block">{w.title}</strong>
                            <span className="text-[10px] text-slate-400">
                              {w.type === 'serialized_story' ? 'Serial' : 'Kitob'} • {formatUzbekDate(w.created_at)}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payout Requests History */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Pul yechish tarixi ({authorDetails.author?.payouts?.length || 0})
                  </span>
                  {authorDetails.author?.payouts?.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                      Pul yechish so‘rovlari mavjud emas.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {authorDetails.author?.payouts?.map((p: any) => (
                        <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div>
                            <strong className="font-serif font-bold text-slate-900">{formatUZS(p.requested_amount)}</strong>
                            <span className="text-[10px] text-slate-400 block">{formatUzbekDate(p.created_at)}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                ? 'Mualliflik arizasini tasdiqlash'
                : actionModal.type === 'reject'
                ? 'Arizani rad etish'
                : actionModal.type === 'suspend'
                ? 'Mualliflik nashr huquqini to‘xtatish'
                : actionModal.type === 'restore'
                ? 'Mualliflik huquqini qayta tiklash'
                : 'Administrator izohi qoldirish'}
            </h3>

            <p className="text-xs text-slate-600">
              Muallif: <strong>{actionModal.penName}</strong>
            </p>

            {(actionModal.type === 'reject' || actionModal.type === 'suspend' || actionModal.type === 'note') && (
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  {actionModal.type === 'note' ? 'Izoh matni:' : 'Majburiy sabab:'} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder={actionModal.type === 'note' ? 'Ichki ma’muriy eslatma...' : 'Sababni batafsil yozing...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
