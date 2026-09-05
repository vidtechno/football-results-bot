'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileDiff,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  User,
  Layers,
  FileText,
  DollarSign,
  Tag,
  Eye,
} from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { formatUZS } from '@/lib/utils/currency';

export default function AdminRevisionsPage() {
  const [workRevisions, setWorkRevisions] = useState<any[]>([]);
  const [chapterRevisions, setChapterRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'works' | 'chapters'>('works');
  const [selectedRevision, setSelectedRevision] = useState<any | null>(null);

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/revisions-action');
      const data = await res.json();
      if (data.success) {
        setWorkRevisions(data.workRevisions || []);
        setChapterRevisions(data.chapterRevisions || []);
      }
    } catch (err) {
      console.error('Error fetching revisions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const handleAction = async (type: 'work' | 'chapter', id: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/revisions-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          revisionId: id,
          action,
          rejectionReason: action === 'reject' ? rejectReason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Amalni bajarishda xatolik yuz berdi');
      }

      setSelectedRevision(null);
      setShowRejectModal(false);
      setRejectReason('');
      await fetchRevisions();
    } catch (err: any) {
      setActionError(err.message || 'Xatolik yuz berdi');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPending = workRevisions.length + chapterRevisions.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <FileDiff className="w-8 h-8 text-amber-600" />
            <span>Tahrirlar Moderatsiyasi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Mualliflar tomonidan nashr qilingan asar va boblarga kiritilgan o‘zgarishlarni tekshirish va tasdiqlash
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-black">
            Kutilmoqda: {totalPending} ta tahrir
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('works')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'works' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Asar tahrirlari ({workRevisions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
            activeTab === 'chapters' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Bob tahrirlari ({chapterRevisions.length})
        </button>
      </div>

      {/* Listing */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            <span>Tahrirlar yuklanmoqda...</span>
          </div>
        ) : (activeTab === 'works' ? workRevisions : chapterRevisions).length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Kutilayotgan tahrirlar mavjud emas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(activeTab === 'works' ? workRevisions : chapterRevisions).map((rev) => {
              const authorName = rev.author?.full_name || rev.author?.email || 'Muallif';
              const workTitle = activeTab === 'works' ? (rev.liveWork?.title || rev.title) : (rev.work?.title || 'Asar');

              return (
                <div key={rev.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-serif font-bold text-slate-900">
                        {rev.title}
                      </strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                        Kutilmoqda
                      </span>
                      {activeTab === 'chapters' && rev.liveChapter && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          Bob #{rev.liveChapter.chapter_number}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {authorName}
                      </span>
                      <span>•</span>
                      <span>Asar: <strong className="text-slate-800">{workTitle}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatUzbekDate(rev.created_at)}
                      </span>
                    </div>

                    {rev.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl pt-1">
                        {rev.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRevision(rev)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs min-h-[40px] flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Solishtirish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(activeTab === 'works' ? 'work' : 'chapter', rev.id, 'approve')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px] flex items-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Tasdiqlash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRevision(rev);
                        setShowRejectModal(true);
                        setRejectReason('');
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs min-h-[40px] flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rad etish</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revision Diff / Compare Modal */}
      {selectedRevision && !showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col overflow-hidden space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-base">
                  {selectedRevision.itemType === 'work' ? 'Asar tahririni solishtirish' : 'Bob tahririni solishtirish'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Muallif: {selectedRevision.author?.full_name || selectedRevision.author?.email} • Yuborilgan: {formatUzbekDate(selectedRevision.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRevision(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* Work Comparison View */}
              {selectedRevision.itemType === 'work' && (
                <div className="space-y-4">
                  {/* Title Diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Hozirgi Asar Nomi (Jonli)
                      </span>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedRevision.liveWork?.title || '—'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                        Taklif etilgan Yangi Nom
                      </span>
                      <p className="text-xs font-bold text-amber-950">
                        {selectedRevision.title}
                      </p>
                    </div>
                  </div>

                  {/* Description Diff */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Hozirgi Tavsif (Jonli)
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-line">
                        {selectedRevision.liveWork?.description || '—'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                        Taklif etilgan Yangi Tavsif
                      </span>
                      <p className="text-xs text-amber-950 whitespace-pre-line">
                        {selectedRevision.description || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Diff */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Kirish turi:</span>
                      <span className="font-bold text-slate-800 capitalize">{selectedRevision.access_type}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Asar narxi:</span>
                      <span className="font-bold text-slate-800">{formatUZS(selectedRevision.full_work_price || 0)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Turi:</span>
                      <span className="font-bold text-slate-800">{selectedRevision.type}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Yosh chegarasi:</span>
                      <span className="font-bold text-slate-800">{selectedRevision.age_rating || '0+'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chapter Comparison View */}
              {selectedRevision.itemType === 'chapter' && (
                <div className="space-y-4">
                  {/* Chapter Header Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                        Hozirgi Bob Nomi va Narxi
                      </span>
                      <p className="text-xs font-bold text-slate-800">
                        {selectedRevision.liveChapter?.title || '—'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {selectedRevision.liveChapter?.is_free ? 'Bepul bob' : `Pulli: ${formatUZS(selectedRevision.liveChapter?.price || 0)}`}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <span className="text-[10px] font-black uppercase text-amber-800 block mb-1">
                        Taklif etilgan Bob Nomi va Narxi
                      </span>
                      <p className="text-xs font-bold text-amber-950">
                        {selectedRevision.title}
                      </p>
                      <p className="text-[11px] text-amber-900 mt-1 font-semibold">
                        {selectedRevision.is_free ? 'Bepul bob' : `Pulli: ${formatUZS(selectedRevision.price || 0)}`}
                      </p>
                    </div>
                  </div>

                  {/* Chapter Content Comparison */}
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase block mb-1.5">
                      Taklif etilgan yangi bob matni:
                    </span>
                    <div
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-80 overflow-y-auto reader-article text-slate-800 text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedRevision.content }}
                    />
                  </div>
                </div>
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleAction(selectedRevision.itemType, selectedRevision.id, 'approve')}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[44px] flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Tasdiqlash va jonli nashrga kiritish</span>
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs min-h-[44px] flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Rad etish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      {showRejectModal && selectedRevision && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Tahrirni rad etish
            </h3>
            <p className="text-xs text-slate-600">
              Muallifga tahrir nima uchun rad etilganini bildiring (ushbu sabab muallif kabinetida ko‘rinadi):
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rad etish sababi (majburiy)..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction(selectedRevision.itemType, selectedRevision.id, 'reject')}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rad etishni tasdiqlash'}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
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
