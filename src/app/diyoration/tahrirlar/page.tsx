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
} from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

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
    } catch {
      // ignore
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
      fetchRevisions();
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
            {(activeTab === 'works' ? workRevisions : chapterRevisions).map((rev) => (
              <div key={rev.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-serif font-bold text-slate-900">
                      {rev.title}
                    </strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                      Kutilmoqda
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {activeTab === 'works' ? 'Asar tahriri' : 'Bob tahriri'} • Yuborilgan: {formatUzbekDate(rev.created_at)}
                  </p>

                  {rev.description && (
                    <p className="text-xs text-slate-600 mt-2 max-w-2xl line-clamp-2">
                      {rev.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedRevision({ ...rev, itemType: activeTab === 'works' ? 'work' : 'chapter' })}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs min-h-[40px]"
                  >
                    Solishtirish
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(activeTab === 'works' ? 'work' : 'chapter', rev.id, 'approve')}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px]"
                  >
                    Tasdiqlash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRevision({ ...rev, itemType: activeTab === 'works' ? 'work' : 'chapter' });
                      setShowRejectModal(true);
                      setRejectReason('');
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs min-h-[40px]"
                  >
                    Rad etish
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revision Diff / Compare Modal */}
      {selectedRevision && !showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl flex flex-col overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Tahrirni ko‘rib chiqish: {selectedRevision.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRevision(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              {selectedRevision.description && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Tavsif tahriri:
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-line text-slate-800">
                    {selectedRevision.description}
                  </div>
                </div>
              )}

              {selectedRevision.content && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                    Bob matni tahriri:
                  </span>
                  <div
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 max-h-72 overflow-y-auto reader-article text-slate-800"
                    dangerouslySetInnerHTML={{ __html: selectedRevision.content }}
                  />
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleAction(selectedRevision.itemType, selectedRevision.id, 'approve')}
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[44px]"
              >
                Tasdiqlash va faollashtirish
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs min-h-[44px]"
              >
                Rad etish
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
              Muallifga tahrir nima uchun rad etilganini bildiring:
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
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50 min-h-[44px]"
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
