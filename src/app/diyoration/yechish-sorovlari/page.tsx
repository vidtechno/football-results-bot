'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Upload,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminPayoutRequestsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ all: number; pending: number; paid: number; rejected: number }>({
    all: 0,
    pending: 0,
    paid: 0,
    rejected: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Card reveal state
  const [revealedCards, setRevealedCards] = useState<Record<string, string>>({});
  const [revealingCardId, setRevealingCardId] = useState<string | null>(null);

  // Action modal
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'pay' | 'reject';
    payoutId: string;
    amount: number;
    authorName: string;
  } | null>(null);
  const [proofUrl, setProofUrl] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/admin/payouts?status=${encodeURIComponent(statusFilter)}`, {
        headers,
        cache: 'no-store',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPayouts(data.payouts || []);
        if (data.counts) {
          setCounts(data.counts);
        }
        setError(null);
      } else {
        setError(data.error || 'Pul yechish so‘rovlarini yuklab bo‘lmadi');
        setPayouts([]);
      }
    } catch {
      setError('Tarmoq xatosi yuz berdi. Qayta urinib ko‘ring.');
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const handleRevealCard = async (payoutId: string) => {
    if (revealedCards[payoutId]) {
      setRevealedCards((prev) => {
        const next = { ...prev };
        delete next[payoutId];
        return next;
      });
      return;
    }

    setRevealingCardId(payoutId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/payout-card', {
        method: 'POST',
        headers,
        body: JSON.stringify({ payoutId }),
      });
      const data = await res.json();
      if (data.success && data.cardNumber) {
        setRevealedCards((prev) => ({ ...prev, [payoutId]: data.cardNumber }));
      } else {
        alert(data.error || 'Kartani ochishda xatolik yuz berdi');
      }
    } catch {
      alert('Tarmoq xatosi');
    } finally {
      setRevealingCardId(null);
    }
  };

  const handleExecutePayoutAction = async () => {
    if (!actionModal) return;
    setActionError(null);

    if (actionModal.type === 'reject' && !adminNote.trim()) {
      setActionError('Rad etish sababi majburiy');
      return;
    }

    setActionLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/admin/payout-action', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requestId: actionModal.payoutId,
          action: actionModal.type === 'pay' ? 'mark_paid' : 'reject',
          proofUrl: proofUrl.trim() || undefined,
          adminNote: adminNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Amalni bajarishda xatolik yuz berdi');
      }

      setActionModal(null);
      setProofUrl('');
      setAdminNote('');
      fetchPayouts();
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
            <CreditCard className="w-8 h-8 text-blue-600" />
            <span>Pul yechish so‘rovlari</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Mualliflar tomonidan ishlab topilgan gonorarlarni bank kartasiga to‘lash va chek bilan tasdiqlash
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black min-h-[32px] inline-flex items-center">
            {loading ? <Skeleton className="h-4 w-20" /> : error ? '—' : `Kutilmoqda: ${counts.pending} ta`}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Barchasi', count: counts.all },
          { id: 'pending', label: 'Kutilayotgan', count: counts.pending },
          { id: 'paid', label: 'To‘langan', count: counts.paid },
          { id: 'rejected', label: 'Rad etilgan', count: counts.rejected },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] flex items-center gap-1.5 ${
              statusFilter === f.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{f.label}</span>
            {!loading && !error && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none ${
                  statusFilter === f.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area: STRICTLY EXCLUSIVE STATES */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>So‘rovlar yuklanmoqda...</span>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </div>
      ) : error ? (
        /* Standalone Error State: NO simultaneous empty state or table underneath */
        <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">{error}</h3>
            <p className="text-xs text-slate-500">
              So‘rovni qayta yuborish orqali ma’lumotlarni qayta yuklashga urinib ko‘ring.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPayouts}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors min-h-[40px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Qayta urinish</span>
          </button>
        </div>
      ) : payouts.length === 0 ? (
        /* Standalone Clean Empty State */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center text-slate-500 text-xs font-semibold space-y-2">
          <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
          <p>Tanlangan filter bo‘yicha pul yechish so‘rovlari mavjud emas.</p>
        </div>
      ) : (
        /* Populated Listing Table */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {payouts.map((p) => {
              const isPending = p.status === 'pending' || p.status === 'under_review';
              const isPaid = p.status === 'paid';
              const isRevealed = Boolean(revealedCards[p.id]);
              const authorDisplayName = p.author?.pen_name || p.legal_name || p.full_legal_name || 'Muallif';
              const legalName = p.legal_name || p.full_legal_name || '—';

              return (
                <div
                  key={p.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-black text-slate-900 text-base">
                        {formatUZS(p.requested_amount)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPaid ? 'To‘langan' : isPending ? 'Kutilmoqda' : p.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>
                        Muallif: <strong className="text-slate-800">{authorDisplayName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Karta egasi: <strong className="text-slate-800">{legalName}</strong>
                      </span>
                      <span>•</span>
                      <span>{formatUzbekDate(p.created_at)}</span>
                    </div>

                    {/* Card display and safe reveal */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono font-bold text-xs text-slate-800 flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isRevealed ? revealedCards[p.id] : p.masked_card || '**** **** **** ****'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevealCard(p.id)}
                        disabled={revealingCardId === p.id}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 min-h-[36px]"
                        title={isRevealed ? 'Kartani yashirish' : 'Kartani to‘liq ko‘rish'}
                      >
                        {revealingCardId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isRevealed ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Yashirish</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ochish</span>
                          </>
                        )}
                      </button>
                    </div>

                    {p.payment_proof_url && (
                      <a
                        href={p.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
                      >
                        <span>To‘lov chekini ko‘rish</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Action buttons */}
                  {isPending && (
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'pay',
                            payoutId: p.id,
                            amount: p.requested_amount,
                            authorName: authorDisplayName,
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs min-h-[44px]"
                      >
                        To‘langan deb belgilash
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionModal({
                            isOpen: true,
                            type: 'reject',
                            payoutId: p.id,
                            amount: p.requested_amount,
                            authorName: authorDisplayName,
                          });
                          setAdminNote('');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs min-h-[44px]"
                      >
                        Rad etish
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payout Action Dialog */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-black text-slate-900 text-base">
              {actionModal.type === 'pay' ? 'Pul yechishni to‘langan deb belgilash' : 'So‘rovni rad etish'}
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Muallif:</span>
                <strong className="text-slate-900">{actionModal.authorName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Summa:</span>
                <strong className="font-serif text-emerald-700">{formatUZS(actionModal.amount)}</strong>
              </div>
            </div>

            {actionModal.type === 'pay' ? (
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  To‘lov cheki havolasi yoki izoh (ixtiyoriy):
                </label>
                <input
                  type="text"
                  placeholder="https://... yoki tranzaksiya raqami"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 min-h-[44px]"
                />
              </div>
            ) : (
              <div>
                <label className="font-bold text-slate-700 block mb-1 text-xs">
                  Rad etish sababi: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Muallifga ko‘rsatiladigan sabab..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 min-h-[44px]"
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
                onClick={handleExecutePayoutAction}
                disabled={actionLoading}
                className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] ${
                  actionModal.type === 'pay' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
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
