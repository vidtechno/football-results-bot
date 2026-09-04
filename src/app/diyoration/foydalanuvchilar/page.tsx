'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Search,
  Filter,
  Wallet,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  User,
  PlusCircle,
  MinusCircle,
  Clock,
  BookOpen,
  History,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  Loader2,
  PenTool,
  Bookmark,
  DollarSign,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';

const PREDEFINED_REASONS = [
  'Telegram orqali qo‘lda to‘lov',
  'noto‘g‘ri operatsiyani tuzatish',
  'qaytarim',
  'bonus',
  'jarima yoki bekor qilish',
  'boshqa',
];

export default function AdminUsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected user detail drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailTab, setDetailTab] = useState<'info' | 'transactions' | 'purchases' | 'author' | 'audit'>('info');

  // Balance adjustment modal
  const [adjustmentModal, setAdjustmentModal] = useState<{
    isOpen: boolean;
    action: 'credit' | 'debit';
  }>({ isOpen: false, action: 'credit' });
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>(PREDEFINED_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [adjNote, setAdjNote] = useState<string>('');
  const [adjLoading, setAdjLoading] = useState<boolean>(false);
  const [adjError, setAdjError] = useState<string | null>(null);
  const [adjSuccessReceipt, setAdjSuccessReceipt] = useState<any | null>(null);
  const [showDoubleConfirm, setShowDoubleConfirm] = useState<boolean>(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load users
  const fetchUsers = useCallback(async (q: string, filter: string, p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}&page=${p}&limit=15`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(searchQuery, activeFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUsers, activeFilter, page]);

  // Debounced search handler
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(val, activeFilter, 1);
    }, 300);
  };

  // Open user drawer
  const openUserDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    setDetailTab('info');
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) {
        setUserDetail(data.user);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  // Execute Balance Adjustment
  const handleExecuteAdjustment = async () => {
    if (!userDetail) return;
    setAdjError(null);
    const numericAmount = parseInt(adjAmount.replace(/\D/g, ''), 10);
    const finalReason = adjReason === 'boshqa' ? customReason.trim() : adjReason;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setAdjError('Summani to‘g‘ri kiriting');
      return;
    }

    if (!finalReason) {
      setAdjError('Sababni ko‘rsatish majburiy');
      return;
    }

    // Unusually large adjustment second confirmation
    if (numericAmount > 1000000 && !showDoubleConfirm) {
      setShowDoubleConfirm(true);
      return;
    }

    setAdjLoading(true);
    try {
      const res = await fetch('/api/admin/wallet-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userDetail.id,
          action: adjustmentModal.action,
          amount: numericAmount,
          reason: finalReason,
          note: adjNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Balansni o‘zgartirishda xatolik yuz berdi');
      }

      setAdjSuccessReceipt(data.receipt);
      setShowDoubleConfirm(false);

      // Refresh current user drawer and list
      openUserDetail(userDetail.id);
      fetchUsers(searchQuery, activeFilter, page);
    } catch (err: any) {
      setAdjError(err.message || 'Xatolik yuz berdi');
    } finally {
      setAdjLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parsedAmount = parseInt(adjAmount.replace(/\D/g, ''), 10) || 0;
  const currentBal = userDetail?.balance || 0;
  const expectedBal = adjustmentModal.action === 'credit'
    ? currentBal + parsedAmount
    : Math.max(0, currentBal - parsedAmount);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-8 h-8 text-blue-600" />
            <span>Foydalanuvchilar Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Barcha kitobxonlar, mualliflar va administratorlarni qidirish, tahlil qilish va balans boshqaruvi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black">
            Jami: {total} nafar
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ism, Manbora ID (MB-...), email yoki UUID bo‘yicha qidiruv..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
            />
          </div>

          {/* Filter Dropdown / Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Barchasi' },
              { id: 'readers', label: 'Kitobxonlar' },
              { id: 'authors', label: 'Mualliflar' },
              { id: 'admins', label: 'Adminlar' },
              { id: 'positive_balance', label: 'Ijobiy balans' },
              { id: 'restricted', label: 'Cheklanganlar' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveFilter(f.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                  activeFilter === f.id
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

      {/* Users List (Table on Desktop, Cards on Mobile) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Foydalanuvchilar yuklanmoqda...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Hech qanday foydalanuvchi topilmadi. Qidiruv so‘zini yoki filtrlarni tekshirib ko‘ring.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-5">Foydalanuvchi</th>
                    <th className="py-3 px-4">Manbora ID</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Roli</th>
                    <th className="py-3 px-4">Balansi</th>
                    <th className="py-3 px-4">Ro‘yxatdan o‘tgan</th>
                    <th className="py-3 px-5 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {u.display_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block text-xs">
                              {u.display_name}
                            </span>
                            <span className="text-[11px] text-slate-400">@{u.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-900">
                        <span className="inline-flex items-center gap-1">
                          <span>{u.public_id}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(u.public_id, u.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title="Nusxalash"
                          >
                            {copiedId === u.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            u.is_admin
                              ? 'bg-purple-100 text-purple-800'
                              : u.author_status === 'approved'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black font-serif text-slate-900">
                        {formatUZS(u.balance)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {formatUzbekDate(u.created_at)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openUserDetail(u.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-all min-h-[36px]"
                        >
                          Tafsilotlar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {u.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <strong className="text-xs font-black text-slate-900 block">
                          {u.display_name}
                        </strong>
                        <span className="text-[11px] text-slate-400">@{u.username}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        u.is_admin
                          ? 'bg-purple-100 text-purple-800'
                          : u.author_status === 'approved'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Manbora ID:</span>
                      <span className="font-mono font-bold text-blue-900">{u.public_id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold block">Balans:</span>
                      <span className="font-serif font-black text-slate-900">{formatUZS(u.balance)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openUserDetail(u.id)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold text-center min-h-[44px] flex items-center justify-center gap-1"
                  >
                    <span>Foydalanuvchi ma’lumotlari</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Sahifa: {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Drawer / Modal */}
      {selectedUserId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="absolute inset-0" onClick={() => setSelectedUserId(null)} />

          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center">
                  {userDetail?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    {userDetail?.display_name || 'Yuklanmoqda...'}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ID: {userDetail?.public_id} • @{userDetail?.username}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center min-h-[44px] min-w-[44px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetail || !userDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Balance & Adjust Actions Box */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kitobxon Hamyon Balansi
                    </span>
                    <p className="font-serif text-2xl sm:text-3xl font-black mt-0.5 text-amber-400">
                      {formatUZS(userDetail.balance)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustmentModal({ isOpen: true, action: 'credit' });
                        setAdjAmount('');
                        setAdjReason(PREDEFINED_REASONS[0]);
                        setAdjError(null);
                        setAdjSuccessReceipt(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[44px]"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Pul qo‘shish</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAdjustmentModal({ isOpen: true, action: 'debit' });
                        setAdjAmount('');
                        setAdjReason(PREDEFINED_REASONS[1]);
                        setAdjError(null);
                        setAdjSuccessReceipt(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[44px]"
                    >
                      <MinusCircle className="w-4 h-4" />
                      <span>Pul ayrish</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none text-xs font-bold">
                  {[
                    { id: 'info', label: 'Profil ma’lumotlari', icon: User },
                    { id: 'transactions', label: `Hamyon jurnali (${userDetail.transactions?.length || 0})`, icon: History },
                    { id: 'purchases', label: `Xaridlar (${userDetail.purchases?.length || 0})`, icon: BookOpen },
                    { id: 'author', label: userDetail.author ? 'Mualliflik' : null, icon: PenTool },
                    { id: 'audit', label: `Audit tarixi (${userDetail.audit_logs?.length || 0})`, icon: ShieldCheck },
                  ]
                    .filter((t) => Boolean(t.label))
                    .map((t: any) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setDetailTab(t.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all min-h-[40px] ${
                            detailTab === t.id
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                </div>

                {/* Tab: Info */}
                {detailTab === 'info' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Email</span>
                        <strong className="text-slate-800 font-mono text-xs">{userDetail.email || '—'}</strong>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Manbora ID</span>
                        <strong className="text-blue-900 font-mono text-xs">{userDetail.public_id}</strong>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Ichki UUID</span>
                        <span className="text-slate-500 font-mono text-[10px] block break-all">{userDetail.id}</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Ro‘yxatdan o‘tgan</span>
                        <span className="text-slate-800 font-semibold">{formatUzbekDate(userDetail.created_at)}</span>
                      </div>
                    </div>

                    {userDetail.bio && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase mb-1">Tarjimai hol (Bio)</span>
                        <p className="text-slate-700 leading-relaxed">{userDetail.bio}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Transactions Ledger */}
                {detailTab === 'transactions' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase">
                      Hamyon amallari (O‘zgarmas Registr)
                    </span>
                    {userDetail.transactions?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                        Ushbu hamyon bo‘yicha tranzaksiyalar mavjud emas.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {userDetail.transactions.map((tx: any) => {
                          const isCredit = tx.amount > 0;
                          return (
                            <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                              <div>
                                <strong className="font-black text-slate-900 block">{tx.description}</strong>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  {formatUzbekDate(tx.created_at)} • Ref: <span className="font-mono">{tx.reference_type}</span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`font-black font-serif text-sm ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isCredit ? '+' : ''}{formatUZS(tx.amount)}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Qoldiq: {formatUZS(tx.balance_after)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Purchases */}
                {detailTab === 'purchases' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase">
                      Xarid qilingan kontentlar
                    </span>
                    {userDetail.purchases?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                        Foydalanuvchi hali pullik xarid qilmagan.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {userDetail.purchases.map((p: any) => (
                          <div key={p.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <strong className="font-bold text-slate-900 block font-serif">{p.work?.title}</strong>
                              <span className="text-[11px] text-slate-500">
                                {p.purchase_type === 'full_work' ? 'To‘liq asar' : `${p.chapter?.chapter_number}-bob: ${p.chapter?.title}`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-black font-serif text-amber-900">{formatUZS(p.gross_amount)}</span>
                              <span className="text-[10px] text-slate-400 block">{formatUzbekDate(p.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Author details (if author) */}
                {detailTab === 'author' && userDetail.author && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase block">Taxallus</span>
                        <strong className="font-serif text-sm font-bold text-stone-900">{userDetail.author.pen_name}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-amber-800 font-bold uppercase block">Holat</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200/80 text-amber-950">
                          {userDetail.author.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 font-medium block">Yechib olish mumkin:</span>
                        <span className="font-serif font-bold text-emerald-700 text-sm">
                          {formatUZS(userDetail.author.balances?.available || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 font-medium block">Band qilingan (Reserved):</span>
                        <span className="font-serif font-bold text-stone-700 text-sm">
                          {formatUZS(userDetail.author.balances?.reserved || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase block">Muallif asarlari ({userDetail.author.works?.length || 0})</span>
                      {userDetail.author.works?.map((w: any) => (
                        <div key={w.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <span className="font-serif font-bold text-slate-900">{w.title}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Audit logs */}
                {detailTab === 'audit' && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-400 block uppercase">
                      Ushbu hisob bo‘yicha ma’muriy audit yozuvlari
                    </span>
                    {userDetail.audit_logs?.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl">
                        Audit yozuvlari yo‘q.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        {userDetail.audit_logs.map((log: any) => (
                          <div key={log.id} className="p-3.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-900">{log.action}</span>
                              <span className="text-[10px] text-slate-400">{formatUzbekDate(log.created_at)}</span>
                            </div>
                            <pre className="text-[10px] font-mono bg-slate-50 p-2 rounded-lg text-slate-700 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {adjustmentModal.isOpen && userDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                {adjustmentModal.action === 'credit' ? (
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-black text-slate-900 text-base">
                  {adjustmentModal.action === 'credit' ? 'Pul qo‘shish (Credit)' : 'Pul ayrish (Debit)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustmentModal({ isOpen: false, action: 'credit' })}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjSuccessReceipt ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Amal muvaffaqiyatli bajarildi!</h4>
                  <p className="text-xs text-slate-500 mt-1">Tranzaksiya va audit o‘zgarmas registrga yozildi.</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">O‘zgartirish summasi:</span>
                    <strong className="text-slate-900">{formatUZS(adjSuccessReceipt.amount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Yangi balans:</span>
                    <strong className="text-emerald-700 font-black">{formatUZS(adjSuccessReceipt.balance_after)}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200 font-mono text-slate-400">
                    <span>Tx ID:</span>
                    <span>{adjSuccessReceipt.transaction_id?.slice(0, 12)}...</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAdjustmentModal({ isOpen: false, action: 'credit' })}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs min-h-[44px]"
                >
                  Yopish
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* User Snapshot */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 block font-bold">{userDetail.display_name}</strong>
                    <span className="text-slate-400 font-mono text-[11px]">{userDetail.public_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-bold">Joriy balans</span>
                    <span className="font-serif font-black text-slate-900">{formatUZS(currentBal)}</span>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Summa (so‘mda, butun son): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: 50 000"
                    value={adjAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setAdjAmount(raw ? Number(raw).toLocaleString('uz-UZ') : '');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
                  />
                </div>

                {/* Reason selector */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Majburiy sabab: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
                  >
                    {PREDEFINED_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {adjReason === 'boshqa' && (
                    <input
                      type="text"
                      placeholder="Aniq sababni yozing..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 min-h-[44px]"
                    />
                  )}
                </div>

                {/* Note input */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Administrator izohi (ixtiyoriy):
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Chek raqami yoki Telegram yozishma havolasi"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 min-h-[44px]"
                  />
                </div>

                {/* Balance Preview */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                  <div className="flex justify-between text-stone-600">
                    <span>Avvalgi balans:</span>
                    <span>{formatUZS(currentBal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-900 font-bold">
                    <span>Kutilayotgan yangi balans:</span>
                    <span className="font-serif text-sm">{formatUZS(expectedBal)}</span>
                  </div>
                </div>

                {showDoubleConfirm && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Katta summa ogohlantirishi!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Siz <strong>{formatUZS(parsedAmount)}</strong> miqdoridagi katta operatsiyani amalga oshirmoqchisiz. Amallarni qaytarib bo‘lmaydi. Rozimisiz?
                    </p>
                  </div>
                )}

                {adjError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {adjError}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteAdjustment}
                    disabled={adjLoading || parsedAmount <= 0}
                    className={`flex-1 py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 min-h-[44px] shadow-sm disabled:opacity-50 ${
                      adjustmentModal.action === 'credit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                    }`}
                  >
                    {adjLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Bajarilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          {showDoubleConfirm ? 'Ha, operatsiyani tasdiqlayman' : 'Tasdiqlash'}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentModal({ isOpen: false, action: 'credit' })}
                    disabled={adjLoading}
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs min-h-[44px]"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
