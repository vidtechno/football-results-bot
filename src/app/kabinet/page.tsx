'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  BookOpen,
  History,
  LogOut,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Bookmark,
  User,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { TopupModal } from '@/components/wallet/TopupModal';
import { TransactionHistoryTable } from '@/components/wallet/TransactionHistoryTable';
import type {
  Profile,
  TopupRequest,
  WalletTransaction,
  Purchase,
  LibraryItem,
} from '@/lib/types/platform';

export default function KabinetPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'topups' | 'transactions' | 'purchases'>('library');

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/kirish?redirect=/kabinet');
        return;
      }

      const userId = session.user.id;

      // 1. Profile (server-synced via /api/auth/profile)
      let resolvedProfile: Profile | null = null;
      try {
        const profRes = await fetch('/api/auth/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (profRes.ok) {
          const profJson = await profRes.json();
          resolvedProfile = profJson.profile;
        }
      } catch {
        // fallback
      }

      if (!resolvedProfile) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        resolvedProfile = profData as Profile;
      }
      setProfile(resolvedProfile);

      // 2. Wallet balance
      const { data: walletData } = await supabase
        .from('wallet_accounts')
        .select('id, balance')
        .eq('user_id', userId)
        .eq('account_type', 'reader_credit')
        .single();

      if (walletData) {
        setBalance(Number(walletData.balance));

        // 3. Transactions
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('account_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setTransactions((txData as WalletTransaction[]) || []);
      }

      // 4. Topup requests
      const { data: topupData } = await supabase
        .from('topup_requests')
        .select('*')
        .eq('reader_id', userId)
        .order('created_at', { ascending: false });
      setTopups((topupData as TopupRequest[]) || []);

      // 5. Purchases
      const { data: purchaseData } = await supabase
        .from('purchases')
        .select(`
          *,
          work:works (id, title, slug, cover_url),
          chapter:chapters (id, chapter_number, title, slug)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      setPurchases((purchaseData as Purchase[]) || []);

      // 6. Library
      const { data: libData } = await supabase
        .from('library_items')
        .select(`
          *,
          work:works (
            id, title, slug, cover_url, access_type, type,
            author:author_profiles (pen_name)
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      setLibrary((libData as LibraryItem[]) || []);
    } catch (err) {
      console.error('Kabinet ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold text-xs sm:text-sm">
        Ma’lumotlar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header Profile & Balance Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shadow-blue-600/20 flex-shrink-0">
            {profile?.display_name?.slice(0, 1).toUpperCase() || 'M'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {profile?.display_name}
              </h1>
              {profile?.is_admin && (
                <Link
                  href="/diyoration"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs shadow-purple-600/20 transition-all"
                  title="Manbora Admin Paneli"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin paneli</span>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
              <span>
                Manbora ID: <strong className="font-mono text-slate-800">{profile?.public_id}</strong>
              </span>
              <span>@{profile?.username}</span>
            </div>
          </div>
        </div>

        {/* Balance Card with Top-up Action */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 sm:px-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">
              Manbora Balansi
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {formatUZS(balance)}
            </p>
          </div>

          <button
            onClick={() => setIsTopupOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>To‘ldirish</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'library'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Kutubxonam ({library.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('topups')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'topups'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Hisob to‘ldirishlar ({topups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Xaridlarim ({purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Hamyon tarixi ({transactions.length})</span>
        </button>

        <button
          onClick={handleSignOut}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Chiqish</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {library.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-bold text-xs sm:text-sm">
                Kutubxonangizda hali asarlar yo‘q
              </p>
              <Link
                href="/asarlar"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700"
              >
                <span>Asarlarni kashf qilish</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {library.map((item) => {
                const w = item.work;
                if (!w) return null;
                return (
                  <Link
                    key={item.work_id}
                    href={`/asarlar/${w.slug}`}
                    className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5"
                  >
                    <div className="w-12 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {w.cover_url ? (
                        <img
                          src={w.cover_url}
                          alt={w.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate">
                        {w.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {w.author?.pen_name || 'Muallif'}
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        Mutolaani davom ettirish →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'topups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Hisob to‘ldirish so‘rovlari tarixi
            </h3>
            <button
              onClick={() => setIsTopupOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Yangi to‘ldirish
            </button>
          </div>

          {topups.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Hali to‘ldirish so‘rovlari yaratilmagan.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              {topups.map((req) => {
                const isApproved = req.status === 'approved';
                const isPending = req.status === 'pending' || req.status === 'under_review';
                const isRejected = req.status === 'rejected';

                return (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">
                          {formatUZS(req.amount)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isApproved
                            ? 'Tasdiqlandi'
                            : isPending
                              ? 'Kutilmoqda'
                              : 'Rad etildi'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatUzbekDate(req.created_at)} • So‘rov ID: <span className="font-mono">{req.id.slice(0, 8)}...</span>
                      </p>
                    </div>

                    {isPending && (
                      <a
                        href={`https://t.me/diyorbek_anorboyev?text=${encodeURIComponent(`Assalomu alaykum! Manbora ID: ${profile?.public_id}\nSo‘rov ID: ${req.id}\nSumma: ${formatUZS(req.amount)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                      >
                        <span>Telegramga chek yuborish</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900">
            Xarid qilingan kitob va boblar
          </h3>

          {purchases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
              Sizda hali pullik xaridlar mavjud emas.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              {purchases.map((p) => (
                <div
                  key={p.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      {p.work?.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {p.purchase_type === 'full_work'
                        ? 'To‘liq asar'
                        : `${p.chapter?.chapter_number}-bob: ${p.chapter?.title}`}
                      {' • '}
                      {formatUzbekDate(p.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-blue-600">
                      {formatUZS(p.gross_amount)}
                    </span>
                    {p.work && (
                      <Link
                        href={`/asarlar/${p.work.slug}`}
                        className="block text-[11px] font-bold text-slate-600 hover:text-blue-600 mt-0.5"
                      >
                        O‘qishga o‘tish →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-900">
            Manbora balansi tarixi
          </h3>
          <TransactionHistoryTable transactions={transactions} />
        </div>
      )}

      {/* Topup Modal */}
      {profile && (
        <TopupModal
          isOpen={isTopupOpen}
          onClose={() => setIsTopupOpen(false)}
          userPublicId={profile.public_id}
          onSuccess={() => loadUserData()}
        />
      )}
    </div>
  );
}
