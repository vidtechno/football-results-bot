'use client';
import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Wallet,
  CreditCard,
  BookOpen,
  PenTool,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase/client';

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAuthors: 0,
    platformRevenue: 0,
    pendingTopupsCount: 0,
    pendingPayoutsCount: 0,
    pendingWorksCount: 0,
  });

  const [topups, setTopups] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [authorApps, setAuthorApps] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [proofModal, setProofModal] = useState<{
    type: 'topup' | 'payout';
    id: string;
    amount: number;
    title: string;
  } | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Stats
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: authorsCount } = await supabase
        .from('author_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { data: revAcc } = await supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('account_type', 'platform_revenue')
        .maybeSingle();

      const { data: pendingTopups, count: pTopupsCount } = await supabase
        .from('topup_requests')
        .select('*, reader:profiles(id, display_name, username, public_id)')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: pendingPayouts, count: pPayoutsCount } = await supabase
        .from('payout_requests')
        .select('*, author:profiles(id, display_name, username, public_id)')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: pendingWorks, count: pWorksCount } = await supabase
        .from('works')
        .select('*, author:author_profiles(pen_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: apps } = await supabase
        .from('author_profiles')
        .select('*, profile:profiles(id, display_name, username, public_id)')
        .order('created_at', { ascending: false });

      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setStats({
        totalUsers: usersCount || 0,
        totalAuthors: authorsCount || 0,
        platformRevenue: revAcc ? Number(revAcc.balance) : 0,
        pendingTopupsCount: (pendingTopups || []).filter((t) => t.status === 'pending').length,
        pendingPayoutsCount: (pendingPayouts || []).filter((p) => p.status === 'pending').length,
        pendingWorksCount: (pendingWorks || []).filter((w) => w.status === 'pending_review').length,
      });

      setTopups(pendingTopups || []);
      setPayouts(pendingPayouts || []);
      setWorks(pendingWorks || []);
      setAuthorApps(apps || []);
      setUsersList(allUsers || []);
    } catch (err) {
      console.error('Admin ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Topup Approval
  async function submitTopupApproval() {
    if (!proofModal || proofModal.type !== 'topup') return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/topup-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: proofModal.id,
          action: 'approve',
          proofUrl: proofUrl.trim(),
          adminNote: adminNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tasdiqlashda xatolik yuz berdi');
      }

      setProofModal(null);
      setProofUrl('');
      setAdminNote('');
      await loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Xatolik yuz berdi');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Topup Reject
  async function handleTopupReject(id: string) {
    if (!confirm('Ushbu hisob to‘ldirish so‘rovini rad etishni tasdiqlaysizmi?')) return;
    setActionLoading(true);
    try {
      await fetch('/api/admin/topup-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'reject',
          adminNote: 'Admin tomonidan rad etildi',
        }),
      });
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Payout Mark Paid
  async function submitPayoutPaid() {
    if (!proofModal || proofModal.type !== 'payout') return;
    if (!proofUrl.trim()) {
      setActionError('To‘lov kvitansiyasi havolasini kiritish shart');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch('/api/admin/payout-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: proofModal.id,
          action: 'mark_paid',
          proofUrl: proofUrl.trim(),
          adminNote: adminNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Tasdiqlashda xatolik yuz berdi');
      }

      setProofModal(null);
      setProofUrl('');
      setAdminNote('');
      await loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Xatolik yuz berdi');
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Payout Reject (Atomic Reversal to available earnings)
  async function handlePayoutReject(id: string) {
    if (!confirm('Ushbu pul yechish so‘rovini rad etishni tasdiqlaysizmi? Band qilingan mablag‘ muallifga qaytariladi.')) return;
    setActionLoading(true);
    try {
      await fetch('/api/admin/payout-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          action: 'reject',
          adminNote: 'Admin tomonidan rad etildi',
        }),
      });
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Work Moderation
  async function handleWorkModeration(workId: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? prompt('Rad etish sababini kiriting:') : undefined;
    if (action === 'reject' && reason === null) return;

    setActionLoading(true);
    try {
      await fetch('/api/admin/moderation-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId,
          action,
          rejectionReason: reason,
        }),
      });
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Author Application
  async function handleAuthorAction(userId: string, action: 'approve' | 'reject') {
    const reason = action === 'reject' ? prompt('Rad etish sababini kiriting:') : undefined;
    if (action === 'reject' && reason === null) return;

    setActionLoading(true);
    try {
      await fetch('/api/admin/author-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          rejectionReason: reason,
        }),
      });
      await loadDashboardData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold text-xs sm:text-sm">
        Boshqaruv ma’lumotlari yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Manbora Boshqaruv Markazi
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Hisob-kitoblar, moderatsiya va platforma monitoringi
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Kitobxonlar
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalUsers}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Mualliflar
          </span>
          <p className="text-xl font-black text-blue-600 mt-1">{stats.totalAuthors}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Platforma daromadi
          </span>
          <p className="text-base font-black text-emerald-600 mt-1 truncate">
            {formatUZS(stats.platformRevenue)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Kutilayotgan to‘ldirish
          </span>
          <p className="text-xl font-black text-amber-600 mt-1">{stats.pendingTopupsCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Kutilayotgan yechish
          </span>
          <p className="text-xl font-black text-purple-600 mt-1">{stats.pendingPayoutsCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
            Moderatsiyadagi asarlar
          </span>
          <p className="text-xl font-black text-rose-600 mt-1">{stats.pendingWorksCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('topups')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'topups' || activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Hisob to‘ldirish ({topups.filter((t) => t.status === 'pending').length})
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pul yechish ({payouts.filter((p) => p.status === 'pending').length})
        </button>

        <button
          onClick={() => setActiveTab('works')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'works'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Asarlar moderatsiyasi ({works.filter((w) => w.status === 'pending_review').length})
        </button>

        <button
          onClick={() => setActiveTab('authors')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'authors'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Muallif arizalari ({authorApps.filter((a) => a.status === 'pending').length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Foydalanuvchilar ({usersList.length})
        </button>
      </div>

      {/* Tab: Topups Queue */}
      {(activeTab === 'topups' || activeTab === 'overview') && (
        <section className="space-y-4">
          <h2 className="text-base font-black text-slate-900">
            Kitobxonlar balansi to‘ldirish so‘rovlari
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sana</th>
                  <th className="py-3 px-4">Kitobxon</th>
                  <th className="py-3 px-4">Manbora ID</th>
                  <th className="py-3 px-4">Summa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {topups.map((t) => {
                  const isPending = t.status === 'pending' || t.status === 'under_review';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatUzbekDate(t.created_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {t.reader?.display_name || 'Kitobxon'}
                      </td>
                      <td className="py-3 px-4 font-mono text-blue-600 font-bold">
                        {t.reader?.public_id || '-'}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatUZS(t.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            t.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {t.status === 'approved'
                            ? 'Tasdiqlangan'
                            : isPending
                              ? 'Kutilmoqda'
                              : 'Rad etilgan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setProofModal({
                                  type: 'topup',
                                  id: t.id,
                                  amount: t.amount,
                                  title: `Hisobni ${formatUZS(t.amount)} ga to‘ldirish`,
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                            >
                              Tasdiqlash (Kredit)
                            </button>
                            <button
                              onClick={() => handleTopupReject(t.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors"
                            >
                              Rad etish
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ko‘rib chiqilgan</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Payouts Queue */}
      {activeTab === 'payouts' && (
        <section className="space-y-4">
          <h2 className="text-base font-black text-slate-900">
            Mualliflar pul yechish (Payout) so‘rovlari
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sana</th>
                  <th className="py-3 px-4">Muallif / F.I.O</th>
                  <th className="py-3 px-4">Karta raqami</th>
                  <th className="py-3 px-4">Summa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payouts.map((p) => {
                  const isPending = p.status === 'pending' || p.status === 'under_review';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatUzbekDate(p.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{p.full_legal_name}</span>
                        <span className="text-[11px] text-slate-400">@{p.author?.username}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {p.masked_card}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {formatUZS(p.requested_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            p.status === 'paid'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {p.status === 'paid'
                            ? 'To‘langan'
                            : isPending
                              ? 'Kutilmoqda'
                              : 'Rad etilgan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setProofModal({
                                  type: 'payout',
                                  id: p.id,
                                  amount: p.requested_amount,
                                  title: `To‘lovni tasdiqlash (${formatUZS(p.requested_amount)})`,
                                });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                            >
                              To‘landi deb belgilash
                            </button>
                            <button
                              onClick={() => handlePayoutReject(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors"
                            >
                              Rad etish
                            </button>
                          </div>
                        ) : (
                          p.payment_proof_url && (
                            <a
                              href={p.payment_proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-[11px] font-bold"
                            >
                              Chekni ko‘rish
                            </a>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Works Moderation */}
      {activeTab === 'works' && (
        <section className="space-y-4">
          <h2 className="text-base font-black text-slate-900">
            Asarlar moderatsiyasi
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Asar nomi</th>
                  <th className="py-3 px-4">Muallif</th>
                  <th className="py-3 px-4">Turi / To‘lov</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {works.map((w) => {
                  const isPending = w.status === 'pending_review';
                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{w.title}</span>
                        <span className="text-[11px] text-slate-400 line-clamp-1">{w.description}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {w.author?.pen_name || 'Muallif'}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {w.type === 'book' ? 'Kitob' : 'Serial'} •{' '}
                        {w.access_type === 'free'
                          ? 'Bepul'
                          : w.access_type === 'paid_full_work'
                            ? formatUZS(w.full_work_price)
                            : 'Bobma-bob'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            w.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700'
                              : isPending
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {w.status === 'published'
                            ? 'Nashr qilingan'
                            : isPending
                              ? 'Moderatsiyada'
                              : w.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleWorkModeration(w.id, 'approve')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Tasdiqlash (Nashr)
                            </button>
                            <button
                              onClick={() => handleWorkModeration(w.id, 'reject')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                            >
                              Rad etish
                            </button>
                          </div>
                        ) : (
                          <Link
                            href={`/asarlar/${w.slug}`}
                            target="_blank"
                            className="text-blue-600 hover:underline text-[11px] font-bold"
                          >
                            Saytda ko‘rish
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Author Applications */}
      {activeTab === 'authors' && (
        <section className="space-y-4">
          <h2 className="text-base font-black text-slate-900">
            Mualliflikka arizalar
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mualliflik taxallusi</th>
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Biografiya / Ma’lumot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {authorApps.map((a) => {
                  const isPending = a.status === 'pending';
                  return (
                    <tr key={a.user_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {a.pen_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{a.profile?.display_name}</span>
                        <span className="text-[11px] text-slate-400 block">@{a.profile?.username}</span>
                      </td>
                      <td className="py-3 px-4 max-w-sm text-[11px] text-slate-600">
                        {a.biography || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            a.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700'
                              : isPending
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {a.status === 'approved' ? 'Tasdiqlangan' : isPending ? 'Kutilmoqda' : a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAuthorAction(a.user_id, 'approve')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Tasdiqlash
                            </button>
                            <button
                              onClick={() => handleAuthorAction(a.user_id, 'reject')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                            >
                              Rad etish
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <section className="space-y-4">
          <h2 className="text-base font-black text-slate-900">
            Foydalanuvchilar bazasi ({usersList.length})
          </h2>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Manbora ID</th>
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {u.public_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.display_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4">
                      {u.is_admin ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                          Admin
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Kitobxon</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {formatUzbekDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Action / Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              {proofModal.title}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tasdiqlash uchun to‘lov cheki havolasini (URL) kiriting.
            </p>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {actionError}
              </div>
            )}

            <div className="space-y-3 text-xs mb-6">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  To‘lov cheki havolasi (URL - skrinshot / kvitansiya)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Admin izohi (ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Tasdiqlandi"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setProofModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={proofModal.type === 'topup' ? submitTopupApproval : submitPayoutPaid}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {actionLoading ? 'Bajarilmoqda...' : 'Tasdiqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-xs text-slate-400">Boshqaruv yuklanmoqda...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
