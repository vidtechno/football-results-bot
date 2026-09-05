'use client';
import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
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
  PenTool,
  Settings,
  Copy,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { TopupModal } from '@/components/wallet/TopupModal';
import { TransactionHistoryTable } from '@/components/wallet/TransactionHistoryTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import type {
  TopupRequest,
  WalletTransaction,
  Purchase,
  LibraryItem,
} from '@/lib/types/platform';

function KabinetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const topupParam = searchParams.get('topup');

  const { user, profile, author, balance, isAdmin, signOut, refreshAuth, isLoading: authLoading } = useAuth();

  const [topups, setTopups] = useState<TopupRequest[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({});
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [isTopupOpen, setIsTopupOpen] = useState(topupParam === 'true');
  const [idCopied, setIdCopied] = useState(false);

  useEffect(() => {
    if (topupParam === 'true') {
      setIsTopupOpen(true);
    }
  }, [topupParam]);

  const [activeTab, setActiveTab] = useState<'library' | 'topups' | 'transactions' | 'purchases'>(
    tabParam === 'topups'
      ? 'topups'
      : tabParam === 'purchases'
      ? 'purchases'
      : tabParam === 'transactions'
      ? 'transactions'
      : 'library'
  );

  // Parallel data loading function (Promise.all - single round-trip batch)
  const loadTabUserData = useCallback(async (userId: string) => {
    setLoadingData(true);
    try {
      // 1. Fetch wallet account for transaction history
      const walletPromise = supabase
        .from('wallet_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('account_type', 'reader_credit')
        .maybeSingle();

      // 2. Fetch topup requests
      const topupPromise = supabase
        .from('topup_requests')
        .select('*')
        .eq('reader_id', userId)
        .order('created_at', { ascending: false });

      // 3. Fetch purchases
      const purchasePromise = supabase
        .from('purchases')
        .select(`
          *,
          work:works (id, title, slug, cover_url),
          chapter:chapters (id, chapter_number, title, slug)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      // 4. Fetch library
      const libraryPromise = supabase
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

      // 5. Fetch reading progress
      const progressPromise = supabase
        .from('reading_progress')
        .select(`
          work_id, chapter_id, page_index, percentage, last_read_at,
          chapter:chapters(id, chapter_number, title, slug)
        `)
        .eq('user_id', userId);

      const [walletRes, topupRes, purchaseRes, libraryRes, progressRes] = await Promise.all([
        walletPromise,
        topupPromise,
        purchasePromise,
        libraryPromise,
        progressPromise,
      ]);

      if (topupRes.data) setTopups(topupRes.data as TopupRequest[]);
      if (purchaseRes.data) setPurchases(purchaseRes.data as Purchase[]);
      if (libraryRes.data) setLibrary(libraryRes.data as LibraryItem[]);

      if (progressRes.data) {
        const pMap: Record<string, any> = {};
        progressRes.data.forEach((p: any) => {
          pMap[p.work_id] = p;
        });
        setProgressMap(pMap);
      }

      // Fetch transactions if wallet exists
      if (walletRes.data?.id) {
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('account_id', walletRes.data.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (txData) setTransactions(txData as WalletTransaction[]);
      }
    } catch (err) {
      console.error('Kabinet ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/kirish?redirect=/kabinet');
    } else if (user?.id) {
      loadTabUserData(user.id);
    }
  }, [user, authLoading, router, loadTabUserData]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header Profile & Balance Bar */}
      <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center font-serif font-black text-xl sm:text-2xl shadow-md shadow-[#1C1917]/10 shrink-0">
            {profile?.display_name?.slice(0, 1).toUpperCase() || 'M'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black font-serif text-[#1C1917] tracking-tight">
                {profile?.display_name || <Skeleton className="h-7 w-36" />}
              </h1>
              {isAdmin && (
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
            <div className="flex items-center gap-3 mt-1 text-xs text-[#78716C] font-medium">
              {profile ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span>ID:</span>
                    <strong className="font-mono text-[#1C1917] bg-[#F5F2EC] px-1.5 py-0.5 rounded text-[11px]">
                      {profile.public_id}
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(profile.public_id);
                        setIdCopied(true);
                        setTimeout(() => setIdCopied(false), 2000);
                      }}
                      className="p-1 text-stone-400 hover:text-amber-800 transition-colors"
                      title="Manbora ID nusxalash"
                    >
                      {idCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </span>
                  <span>@{profile.username}</span>
                </>
              ) : (
                <Skeleton className="h-4 w-40" />
              )}
            </div>
          </div>
        </div>

        {/* Balance Card & Author Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {author && author.status === 'approved' ? (
            <Link
              href="/muallif"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-bold text-xs hover:bg-[#FDE68A] transition-colors"
            >
              <PenTool className="w-4 h-4 text-[#B45309]" />
              <span>Mualliflik kabineti</span>
            </Link>
          ) : (
            <Link
              href="/muallif"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E] font-bold text-xs transition-colors"
            >
              <PenTool className="w-4 h-4 text-[#B45309]" />
              <span>Muallif bo‘lish</span>
            </Link>
          )}

          <div className="flex items-center justify-between gap-4 bg-[#FAF8F5] border border-[#EAE5DD] rounded-2xl p-3 sm:px-5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309] block">
                Kitobxon balansi
              </span>
              <p className="text-lg sm:text-xl font-black text-[#1C1917] font-serif">
                {balance !== null ? formatUZS(balance) : <Skeleton className="h-6 w-24" />}
              </p>
            </div>

            <button
              id="open-topup-modal-btn"
              type="button"
              onClick={() => setIsTopupOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>To‘ldirish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAE5DD] pb-2 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('library')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTab === 'library'
              ? 'bg-[#B45309] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F5F2EC]',
          )}
        >
          <Bookmark className="w-4 h-4" />
          <span>Kutubxonam ({loadingData ? '...' : library.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('topups')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTab === 'topups'
              ? 'bg-[#B45309] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F5F2EC]',
          )}
        >
          <Wallet className="w-4 h-4" />
          <span>To‘lovlar tarixi ({loadingData ? '...' : topups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTab === 'purchases'
              ? 'bg-[#B45309] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F5F2EC]',
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Xaridlarim ({loadingData ? '...' : purchases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap min-h-[44px]',
            activeTab === 'transactions'
              ? 'bg-[#B45309] text-white shadow-xs'
              : 'text-[#57534E] hover:bg-[#F5F2EC]',
          )}
        >
          <History className="w-4 h-4" />
          <span>Hamyon amallari ({loadingData ? '...' : transactions.length})</span>
        </button>

        <button
          onClick={handleSignOut}
          className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          <span>Chiqish</span>
        </button>
      </div>

      {/* Tab Contents with Skeleton State */}
      {loadingData ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'library' && (
            <div className="space-y-4">
              {library.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD]">
                  <Bookmark className="w-10 h-10 text-[#A8A29E] mx-auto mb-2" />
                  <p className="text-[#1C1917] font-bold text-sm font-serif">
                    Kutubxonangizda hali asarlar yo‘q
                  </p>
                  <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto">
                    Katalogdan o‘zingizga ma’qul kitob yoki hikoyani tanlang va mutolaani boshlang.
                  </p>
                  <Link
                    href="/asarlar"
                    className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#B45309] text-white font-bold text-xs shadow-xs hover:bg-[#92400E] transition-colors"
                  >
                    <span>Asarlarni kashf qilish</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {library.map((item) => {
                    const w = item.work;
                    if (!w) return null;
                    const prog = progressMap[item.work_id];
                    const targetChapter = prog?.chapter;
                    const targetPage = prog?.page_index;
                    const readUrl = targetChapter
                      ? `/asarlar/${w.slug}/${targetChapter.slug}${targetPage && targetPage > 1 ? `?page=${targetPage}` : ''}`
                      : `/asarlar/${w.slug}`;
                    const currentPercent = typeof prog?.percentage === 'number'
                      ? prog.percentage
                      : typeof item.reading_progress === 'number'
                      ? item.reading_progress
                      : 0;

                    return (
                      <Link
                        key={item.work_id}
                        href={readUrl}
                        className="group p-4 rounded-2xl bg-white border border-[#EAE5DD] hover:border-[#B45309] shadow-2xs hover:shadow-xs transition-all flex items-center gap-3.5"
                      >
                        <div className="relative w-12 h-16 rounded-xl bg-[#FAF8F5] border border-[#EAE5DD] overflow-hidden shrink-0 shadow-2xs">
                          {w.cover_url ? (
                            <Image
                              src={w.cover_url}
                              alt={w.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="48px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#B45309]">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold font-serif text-[#1C1917] text-xs sm:text-sm truncate group-hover:text-[#B45309] transition-colors">
                            {w.title}
                          </h4>
                          <p className="text-[11px] text-[#78716C] font-medium truncate mt-0.5">
                            {w.author?.pen_name || 'Muallif'}
                          </p>
                          {targetChapter && (
                            <p className="text-[10px] text-[#A8A29E] font-medium truncate">
                              Oxirgi: {targetChapter.chapter_number}-bob {targetPage && targetPage > 1 ? `(${targetPage}-bet)` : ''}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-md">
                              O‘qishni davom ettirish →
                            </span>
                            {currentPercent > 0 && (
                              <span className="text-[10px] text-[#78716C] font-semibold">
                                {currentPercent}%
                              </span>
                            )}
                          </div>
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
                <h3 className="text-sm font-bold font-serif text-[#1C1917]">
                  Hisob to‘ldirish so‘rovlari tarixi
                </h3>
                <button
                  onClick={() => setIsTopupOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold transition-colors"
                >
                  Yangi to‘ldirish
                </button>
              </div>

              {topups.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE5DD] text-[#78716C] text-xs">
                  Hali to‘ldirish so‘rovlari yaratilmagan.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE5DD] divide-y divide-[#F5F2EC] overflow-hidden shadow-2xs">
                  {topups.map((req) => {
                    const isApproved = req.status === 'approved';
                    const isPending = req.status === 'pending' || req.status === 'under_review';

                    return (
                      <div
                        key={req.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-[#1C1917] text-sm font-serif">
                              {formatUZS(req.amount)}
                            </span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded-md text-[10px] font-black uppercase',
                                isApproved
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              )}
                            >
                              {isApproved
                                ? 'Tasdiqlandi'
                                : isPending
                                ? 'Kutilmoqda'
                                : 'Rad etildi'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A8A29E] mt-0.5">
                            {formatUzbekDate(req.created_at)} • So‘rov ID: <span className="font-mono">{req.id.slice(0, 8)}...</span>
                          </p>
                        </div>

                        {isPending && (
                          <a
                            href={`https://t.me/diyorbek_anorboyev?text=${encodeURIComponent(`Assalomu alaykum! Manbora ID: ${profile?.public_id}\nSo‘rov ID: ${req.id}\nSumma: ${formatUZS(req.amount)}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] hover:underline"
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
              <h3 className="text-sm font-bold font-serif text-[#1C1917]">
                Xarid qilingan kitob va boblar
              </h3>

              {purchases.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE5DD] text-[#78716C] text-xs">
                  Sizda hali pullik xaridlar mavjud emas.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#EAE5DD] divide-y divide-[#F5F2EC] overflow-hidden shadow-2xs">
                  {purchases.map((p) => {
                    const isFull = p.purchase_type === 'full_work';
                    const targetUrl = isFull || !p.chapter?.slug
                      ? `/asarlar/${p.work?.slug || p.work_id}`
                      : `/asarlar/${p.work?.slug || p.work_id}/${p.chapter.slug}`;

                    return (
                      <div
                        key={p.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-[#FAF8F5] transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isFull
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-stone-100 text-stone-700 border border-stone-200'
                              }`}
                            >
                              {isFull ? 'Kitob xaridi' : 'Bob xaridi'}
                            </span>
                            <h4 className="font-bold text-[#1C1917] text-sm">
                              {p.work?.title || 'Asar'}
                            </h4>
                          </div>

                          <p className="text-[11px] text-[#78716C]">
                            {isFull
                              ? 'To‘liq kitob mutolaasi'
                              : `${p.chapter?.chapter_number || ''}-bob: ${p.chapter?.title || 'Bob'}`}
                            {' • '}
                            {formatUzbekDate(p.created_at)}
                          </p>
                        </div>

                        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5">
                          <span className="font-black text-[#B45309] text-sm">
                            {formatUZS(p.gross_amount)}
                          </span>
                          {p.work && (
                            <Link
                              href={targetUrl}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#78716C] hover:text-[#B45309] transition-colors min-h-[32px]"
                            >
                              <span>O‘qishga o‘tish</span>
                              <span>→</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-serif text-[#1C1917]">
                Manbora balansi tarixi
              </h3>
              <TransactionHistoryTable transactions={transactions} />
            </div>
          )}
        </>
      )}

      {/* Topup Modal */}
      <TopupModal
        isOpen={isTopupOpen}
        onClose={() => {
          setIsTopupOpen(false);
          if (topupParam) {
            router.replace('/kabinet');
          }
        }}
        userBalance={balance ?? 0}
        userName={profile?.display_name || user?.email || 'Foydalanuvchi'}
        publicId={profile?.public_id || 'MB-00000000'}
        userEmail={user?.email}
      />
    </div>
  );
}

export default function KabinetPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-20 animate-pulse">
          <div className="h-40 rounded-3xl bg-stone-100" />
          <div className="h-10 w-72 rounded-xl bg-stone-100" />
          <div className="h-64 rounded-3xl bg-stone-100" />
        </div>
      }
    >
      <KabinetContent />
    </Suspense>
  );
}
