'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PenTool,
  Plus,
  CreditCard,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { PayoutModal } from '@/components/wallet/PayoutModal';
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone';
import type {
  AuthorProfile,
  Work,
  PayoutRequest,
  Genre,
} from '@/lib/types/platform';

export default function MuallifStudioPage() {
  const router = useRouter();
  const [author, setAuthor] = useState<AuthorProfile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [availableEarnings, setAvailableEarnings] = useState<number>(0);
  const [reservedEarnings, setReservedEarnings] = useState<number>(0);
  const [grossEarnings, setGrossEarnings] = useState<number>(0);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [penName, setPenName] = useState('');
  const [biography, setBiography] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Payout modal state
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);

  // New Work modal state
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkCover, setNewWorkCover] = useState('');
  const [newWorkType, setNewWorkType] = useState<'book' | 'serialized_story'>('book');
  const [newWorkAccess, setNewWorkAccess] = useState<'free' | 'paid_full_work' | 'paid_by_chapter'>('free');
  const [newWorkPrice, setNewWorkPrice] = useState<string>('15000');
  const [newWorkGenre, setNewWorkGenre] = useState<string>('');
  const [savingWork, setSavingWork] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);

  useEffect(() => {
    loadAuthorData();
  }, []);

  async function loadAuthorData() {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/kirish?redirect=/muallif');
        return;
      }

      const userId = session.user.id;

      // 1. Author Profile
      const { data: authorData } = await supabase
        .from('author_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      setAuthor(authorData as AuthorProfile);

      // Fetch active genres for work creation
      const { data: genresData } = await supabase
        .from('genres')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setGenres((genresData as Genre[]) || []);
      if (genresData && genresData.length > 0) {
        setNewWorkGenre(genresData[0].id);
      }

      if (authorData && authorData.status === 'approved') {
        // 2. Author Earnings accounts
        const { data: availAcc } = await supabase
          .from('wallet_accounts')
          .select('balance')
          .eq('user_id', userId)
          .eq('account_type', 'author_earnings_available')
          .maybeSingle();

        const { data: resAcc } = await supabase
          .from('wallet_accounts')
          .select('balance')
          .eq('user_id', userId)
          .eq('account_type', 'author_earnings_reserved')
          .maybeSingle();

        const avail = availAcc ? Number(availAcc.balance) : 0;
        const res = resAcc ? Number(resAcc.balance) : 0;
        setAvailableEarnings(avail);
        setReservedEarnings(res);

        // 3. Works
        const { data: worksData } = await supabase
          .from('works')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false });

        setWorks((worksData as Work[]) || []);

        // 4. Payout requests
        const { data: payoutsData } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false });

        setPayouts((payoutsData as PayoutRequest[]) || []);

        // 5. Total gross sales
        const { data: purchasesData } = await supabase
          .from('purchases')
          .select('gross_amount')
          .eq('author_id', userId);

        const totalGross = (purchasesData || []).reduce(
          (acc, p) => acc + Number(p.gross_amount),
          0,
        );
        setGrossEarnings(totalGross);
      }
    } catch (err) {
      console.error('Muallif kabineti xatosi:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyAuthor(e: React.FormEvent) {
    e.preventDefault();
    setApplying(true);
    setApplyError(null);

    try {
      const res = await fetch('/api/authors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penName, biography }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Arizani yuborishda xatolik yuz berdi');
      }

      await loadAuthorData();
    } catch (err: any) {
      setApplyError(err.message || 'Xatolik yuz berdi');
    } finally {
      setApplying(false);
    }
  }

  async function handleCreateWork(e: React.FormEvent) {
    e.preventDefault();
    setSavingWork(true);
    setWorkError(null);

    try {
      const res = await fetch('/api/works/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newWorkTitle.trim(),
          description: newWorkDesc.trim(),
          coverUrl: newWorkCover.trim() || null,
          type: newWorkType,
          accessType: newWorkAccess,
          fullWorkPrice: newWorkAccess === 'paid_full_work' ? Number(newWorkPrice) : 0,
          genreIds: newWorkGenre ? [newWorkGenre] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Asarni yaratishda xatolik yuz berdi');
      }

      setIsNewWorkOpen(false);
      setNewWorkTitle('');
      setNewWorkDesc('');
      setNewWorkCover('');
      await loadAuthorData();
      router.push(`/muallif/asar/${data.work.id}`);
    } catch (err: any) {
      setWorkError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSavingWork(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold text-xs sm:text-sm">
        Mualliflik kabineti yuklanmoqda...
      </div>
    );
  }

  // Case 1: User has not applied or application is pending / rejected
  if (!author || author.status !== 'approved') {
    const isPending = author?.status === 'pending';
    const isRejected = author?.status === 'rejected';

    return (
      <div className="max-w-xl mx-auto my-8 sm:my-16 px-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
              <PenTool className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Manbora Mualliflik Bo‘limi
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              O‘z asarlaringizni nashr qiling va kitobxonlar xarididan daromad toping
            </p>
          </div>

          {isPending ? (
            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Arizangiz ko‘rib chiqilmoqda
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Mualliflik arizangiz administrator tomonidan tekshirilmoqda. Tasdiqlanganidan so‘ng asar qo‘shish imkoniyati ochiladi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleApplyAuthor} className="space-y-4">
              {isRejected && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  Avvalgi arizangiz rad etilgan: {author?.rejection_reason || 'Talablarga javob bermadi'}. Qaytadan ariza topshirishingiz mumkin.
                </div>
              )}

              {applyError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mualliflik taxallusi yoki to‘liq ismingiz
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Otabek Jo‘rayev"
                  value={penName}
                  onChange={(e) => setPenName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  O‘zingiz va ijodingiz haqida qisqacha
                </label>
                <textarea
                  rows={4}
                  placeholder="Qaysi janrlarda yozasiz, avval qanday asarlar e’lon qilgansiz..."
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden text-xs sm:text-sm text-slate-900 font-medium"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={applying}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Yuborilmoqda...</span>
                  </>
                ) : (
                  <>
                    <span>Mualliflikka ariza yuborish</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Case 2: User is an approved author -> Full Studio
  const canRequestPayout = availableEarnings >= 100000;

  return (
    <div className="space-y-8 pb-16">
      {/* Studio Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Muallif Studiyasi
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
              Faol
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Muallif: <strong className="text-slate-800">{author.pen_name}</strong>
          </p>
        </div>

        <button
          onClick={() => setIsNewWorkOpen(true)}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi asar yaratish</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Earnings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Yechib olish mumkin
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-emerald-600">
              {formatUZS(availableEarnings)}
            </span>
          </div>
          <button
            onClick={() => setIsPayoutOpen(true)}
            disabled={!canRequestPayout}
            className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pul yechish (min. 100k)</span>
          </button>
        </div>

        {/* Reserved Earnings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Band qilingan mablag‘
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-amber-600">
              {formatUZS(reservedEarnings)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            To‘lov tasdiqlanishi kutilmoqda
          </span>
        </div>

        {/* Total Gross Sales */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Jami kitob savdosi
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-slate-900">
              {formatUZS(grossEarnings)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            O‘quvchilar tomonidan to‘langan
          </span>
        </div>

        {/* Platform Share */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Platforma komissiyasi
          </span>
          <div className="my-2">
            <span className="text-2xl font-black text-blue-600">
              20%
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Muallif ulushi: <strong>80%</strong>
          </span>
        </div>
      </div>

      {/* Author's Works Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Mening asarlarim ({works.length})
          </h2>
          <button
            onClick={() => setIsNewWorkOpen(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi asar</span>
          </button>
        </div>

        {works.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-bold text-xs sm:text-sm">
              Hozircha hech qanday asar yaratmadingiz
            </p>
            <button
              onClick={() => setIsNewWorkOpen(true)}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700"
            >
              Birinchi asarni boshlash
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map((w) => {
              const isPub = w.status === 'published';
              const isPending = w.status === 'pending_review';
              const isDraft = w.status === 'draft';
              const isRej = w.status === 'rejected';

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-18 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {w.cover_url ? (
                        <img
                          src={w.cover_url}
                          alt={w.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600">
                          <BookOpen className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase mb-1 ${
                          isPub
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isRej
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPub
                          ? 'Nashr qilingan'
                          : isPending
                            ? 'Moderatsiyada'
                            : isRej
                              ? 'Rad etilgan'
                              : 'Qoralama'}
                      </span>

                      <h3 className="font-black text-slate-900 text-sm truncate">
                        {w.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {w.access_type === 'free'
                          ? 'Bepul'
                          : w.access_type === 'paid_full_work'
                            ? formatUZS(w.full_work_price)
                            : 'Bobma-bob'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href={`/muallif/asar/${w.id}`}
                      className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Boblar va tahrirlash →</span>
                    </Link>

                    {isPub && (
                      <Link
                        href={`/asarlar/${w.slug}`}
                        target="_blank"
                        className="text-slate-400 hover:text-slate-700"
                        title="Saytda ko‘rish"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Payout History Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Pul yechib olish so‘rovlari tarixi
          </h2>
          <button
            onClick={() => setIsPayoutOpen(true)}
            disabled={!canRequestPayout}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
          >
            Yangi so‘rov
          </button>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Hozircha pul yechish so‘rovlari yuborilmagan.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {payouts.map((p) => {
              const isPaid = p.status === 'paid';
              const isPending = p.status === 'pending' || p.status === 'under_review';
              const isRejected = p.status === 'rejected';

              return (
                <div
                  key={p.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        {formatUZS(p.requested_amount)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPaid ? 'To‘landi' : isPending ? 'Kutilmoqda' : 'Rad etildi'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Karta: <strong className="font-mono text-slate-700">{p.masked_card}</strong> • {p.full_legal_name} • {formatUzbekDate(p.created_at)}
                    </p>
                  </div>

                  {p.payment_proof_url && (
                    <a
                      href={p.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex-shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>To‘lov chekini ko‘rish</span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Payout Modal */}
      <PayoutModal
        isOpen={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
        availableEarnings={availableEarnings}
        onSuccess={() => loadAuthorData()}
      />

      {/* Create New Work Modal */}
      {isNewWorkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              Yangi asar yaratish
            </h3>

            {workError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {workError}
              </div>
            )}

            <form onSubmit={handleCreateWork} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asar nomi
                </label>
                <input
                  type="text"
                  placeholder="Masalan: O‘tkan kunlar"
                  value={newWorkTitle}
                  onChange={(e) => setNewWorkTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asar turi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewWorkType('book')}
                    className={`py-2 px-3 rounded-xl border font-bold ${
                      newWorkType === 'book'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Oddiy kitob
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWorkType('serialized_story')}
                    className={`py-2 px-3 rounded-xl border font-bold ${
                      newWorkType === 'serialized_story'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Davomli qissa (Serial)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kirish / To‘lov modeli
                </label>
                <select
                  value={newWorkAccess}
                  onChange={(e) => setNewWorkAccess(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                >
                  <option value="free">To‘liq bepul</option>
                  <option value="paid_full_work">To‘liq asar uchun bitta narx</option>
                  <option value="paid_by_chapter">Bobma-bob to‘lov (har bir bobga alohida)</option>
                </select>
              </div>

              {newWorkAccess === 'paid_full_work' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    To‘liq asar narxi (so‘m):
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={newWorkPrice}
                    onChange={(e) => setNewWorkPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                  />
                </div>
              )}

              {genres.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Asosiy janr
                  </label>
                  <select
                    value={newWorkGenre}
                    onChange={(e) => setNewWorkGenre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                  >
                    {genres.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <ImageUploadDropzone
                  value={newWorkCover || null}
                  onChange={(url) => setNewWorkCover(url || '')}
                  type="cover"
                  label="Muqova rasmi (Qurilmadan yuklash)"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Asar tavsifi (Annotatsiya)
                </label>
                <textarea
                  rows={3}
                  placeholder="Asar haqida qisqacha ma’lumot..."
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewWorkOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingWork}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {savingWork ? 'Saqlanmoqda...' : 'Yaratish va davom etish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
