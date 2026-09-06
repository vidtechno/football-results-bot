'use client';

import React, { useEffect, useState, useCallback, Suspense, useRef } from 'react';
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
  Bell,
  Shield,
  Lock,
  Camera,
  Save,
  Loader2,
  Sparkles,
  Heart,
  Users,
  Compass,
  ArrowRight,
  AlertCircle,
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

type KabinetTab =
  | 'overview'
  | 'profile'
  | 'finances'
  | 'notifications'
  | 'security'
  | 'quick_links';

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
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [isTopupOpen, setIsTopupOpen] = useState(topupParam === 'true');
  const [idCopied, setIdCopied] = useState(false);

  // Profile edit form state
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    email_marketing: false,
    in_site_news: true,
    promotions: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  // Security form state
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  // Tab mapping
  const resolveTab = (param: string | null): KabinetTab => {
    if (param === 'profile') return 'profile';
    if (param === 'finances' || param === 'topups' || param === 'purchases' || param === 'transactions') return 'finances';
    if (param === 'notifications') return 'notifications';
    if (param === 'security') return 'security';
    if (param === 'quick_links') return 'quick_links';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<KabinetTab>(resolveTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(resolveTab(tabParam));
    }
  }, [tabParam]);

  useEffect(() => {
    if (topupParam === 'true') {
      setIsTopupOpen(true);
    }
  }, [topupParam]);

  // Sync profile data to edit state
  useEffect(() => {
    if (profile) {
      setEditName(profile.display_name || '');
      setEditUsername(profile.username || '');
      setEditBio(profile.bio || '');
      setEditTelegram(profile.telegram_username || '');
      setAvatarUrl(profile.avatar_url || '');
      if (profile.notification_preferences) {
        setNotifPrefs({
          email_marketing: Boolean(profile.notification_preferences.email_marketing),
          in_site_news: profile.notification_preferences.in_site_news !== false,
          promotions: profile.notification_preferences.promotions !== false,
        });
      }
    }
  }, [profile]);

  // Parallel data loading function
  const loadTabUserData = useCallback(async (userId: string) => {
    setLoadingData(true);
    try {
      const walletPromise = supabase
        .from('wallet_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('account_type', 'reader_credit')
        .maybeSingle();

      const topupPromise = supabase
        .from('topup_requests')
        .select('*')
        .eq('reader_id', userId)
        .order('created_at', { ascending: false });

      const purchasePromise = supabase
        .from('purchases')
        .select(`
          *,
          work:works (id, title, slug, cover_url),
          chapter:chapters (id, chapter_number, title, slug)
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

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

      const progressPromise = supabase
        .from('reading_progress')
        .select(`
          work_id, chapter_id, page_index, percentage, last_read_at,
          chapter:chapters(id, chapter_number, title, slug),
          work:works(id, title, slug, cover_url, author:author_profiles(pen_name))
        `)
        .eq('user_id', userId)
        .order('last_read_at', { ascending: false })
        .limit(6);

      const bookmarksPromise = fetch('/api/bookmarks')
        .then((res) => res.json())
        .catch(() => ({ success: false, bookmarks: [] }));

      const [walletRes, topupRes, purchaseRes, libraryRes, progressRes, bmRes] = await Promise.all([
        walletPromise,
        topupPromise,
        purchasePromise,
        libraryPromise,
        progressPromise,
        bookmarksPromise,
      ]);

      if (topupRes.data) setTopups(topupRes.data as TopupRequest[]);
      if (purchaseRes.data) setPurchases(purchaseRes.data as Purchase[]);
      if (libraryRes.data) setLibrary(libraryRes.data as LibraryItem[]);
      if (bmRes.success && Array.isArray(bmRes.bookmarks)) setBookmarks(bmRes.bookmarks);

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
      router.push('/kirish?returnUrl=/kabinet');
    } else if (user?.id) {
      loadTabUserData(user.id);
    }
  }, [user, authLoading, router, loadTabUserData]);

  async function handleSignOut() {
    await signOut();
    router.push('/');
    router.refresh();
  }

  // Handle Profile Update
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editName,
          username: editUsername,
          bio: editBio,
          telegram_username: editTelegram,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Profilni saqlashda xatolik yuz berdi');
      }

      setProfileSuccess('Profil ma’lumotlari muvaffaqiyatli saqlandi!');
      await refreshAuth();
    } catch (err: any) {
      setProfileError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSavingProfile(false);
    }
  }

  // Handle Avatar Upload
  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Avatar hajmi 2 MB dan oshmasligi kerak');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const res = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Avatar yuklashda xatolik');
      }

      setAvatarUrl(json.url);
      await refreshAuth();
    } catch (err: any) {
      alert(err.message || 'Avatar yuklash muvaffaqiyatsiz bo‘ldi');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  // Handle Notification Preferences Update
  async function handleSaveNotifs(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotifs(true);
    setNotifSuccess(false);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_preferences: notifPrefs,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setNotifSuccess(true);
        setTimeout(() => setNotifSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving notification preferences:', err);
    } finally {
      setSavingNotifs(false);
    }
  }

  // Handle Email Change
  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'To‘g‘ri email manzilini kiriting' });
      return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailMsg({
        type: 'success',
        text: 'Yangi pochtangizga tasdiqlash xati yuborildi. Iltimos, pochtangizni tekshiring.',
      });
      setNewEmail('');
    } catch (err: any) {
      setEmailMsg({ type: 'error', text: err.message || 'Emailni o‘zgartirib bo‘lmadi' });
    } finally {
      setEmailLoading(false);
    }
  }

  // Handle Password Change
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Parol kamida 6 ta belgidan iborat bo‘lishi lozim' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Parol va uning takrori mos kelmadi' });
      return;
    }
    setPassLoading(true);
    setPassMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPassMsg({ type: 'success', text: 'Parolingiz muvaffaqiyatli yangilandi!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Parolni o‘zgartirib bo‘lmadi' });
    } finally {
      setPassLoading(false);
    }
  }

  const switchTab = (t: KabinetTab) => {
    setActiveTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.replaceState({}, '', url.toString());
  };

  if (authLoading) {
    return (
      <div className="space-y-6 pb-16 animate-pulse">
        <div className="h-32 bg-stone-100 rounded-3xl border border-stone-200" />
        <div className="h-12 w-64 bg-stone-100 rounded-2xl" />
        <div className="h-64 bg-stone-100 rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header Profile & Balance Bar */}
      <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1C1917] text-white flex items-center justify-center font-serif font-black text-xl sm:text-2xl shadow-md shadow-[#1C1917]/10 shrink-0 overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              profile?.display_name?.slice(0, 1).toUpperCase() || 'M'
            )}
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

        {/* Balance Card & Author Studio Link */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {authLoading ? (
            <Skeleton className="h-10 w-36 rounded-2xl" />
          ) : author && author.status === 'approved' ? (
            <Link
              href="/muallif"
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-bold text-xs hover:bg-[#FDE68A] transition-colors"
            >
              <PenTool className="w-4 h-4 text-[#B45309]" />
              <span>Mualliflik kabineti</span>
            </Link>
          ) : (
            <Link
              href="/muallif-boling"
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
              <span className="text-base sm:text-lg font-black font-mono text-[#1C1917]">
                {balance !== null ? formatUZS(balance) : <Skeleton className="h-6 w-24" />}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTopupOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>To‘ldirish</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Tabs Navigation Header */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-[#EAE5DD]">
        {[
          { id: 'overview', label: 'Umumiy ko‘rinish', icon: Compass },
          { id: 'profile', label: 'Profil ma’lumotlari', icon: User },
          { id: 'finances', label: 'Xaridlar va balans', icon: Wallet },
          { id: 'notifications', label: 'Bildirishnomalar', icon: Bell },
          { id: 'security', label: 'Xavfsizlik', icon: Shield },
          { id: 'quick_links', label: 'Tezkor havolalar', icon: Bookmark },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id as KabinetTab)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-stone-900 text-white shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Continue Reading Quick List */}
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-black text-lg text-stone-900">Mutolaani davom ettirish</h3>
              </div>
              <Link
                href="/kutubxona?tab=reading"
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                <span>Barchasini ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {Object.keys(progressMap).length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">Hozircha mutolaa qilinayotgan asarlar yo‘q.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(progressMap).slice(0, 3).map((item: any) => {
                  const w = item.work;
                  const ch = item.chapter;
                  const readUrl = ch && w ? `/asarlar/${w.slug}/${ch.slug}` : w ? `/asarlar/${w.slug}` : '/asarlar';

                  return (
                    <div
                      key={item.work_id}
                      className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-center gap-3"
                    >
                      <div className="relative w-12 h-16 rounded-xl bg-stone-200 overflow-hidden shrink-0">
                        {w?.cover_url ? (
                          <Image src={w.cover_url} alt={w?.title || ''} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-serif font-bold text-xs text-stone-900 truncate">{w?.title || 'Asar'}</h4>
                        {ch && (
                          <p className="text-[11px] text-stone-500 truncate">
                            {ch.chapter_number}-bob: {ch.title}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-amber-800 font-bold">
                          <span>{item.percentage || 0}% o‘qildi</span>
                          <Link href={readUrl} className="underline hover:text-amber-950">
                            O‘qish
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookmarks Quick List */}
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-black text-lg text-stone-900">Saqlangan xatcho‘plar</h3>
              </div>
              <Link
                href="/kutubxona?tab=bookmarks"
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                <span>Barchasini ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">
                Xatcho‘plar mavjud emas. Mutolaa vaqtida yuqoridagi xatcho‘p tugmasi orqali sahifalarni saqlang.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarks.slice(0, 3).map((b: any) => {
                  const w = b.work;
                  const ch = b.chapter;
                  const readUrl = ch && w ? `/asarlar/${w.slug}/${ch.slug}?page=${b.page_number}` : `/asarlar`;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/60 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-serif font-bold text-xs text-stone-900 truncate">{w?.title || 'Asar'}</h4>
                        <p className="text-[11px] text-amber-800 font-semibold">
                          {ch ? `${ch.chapter_number}-bob, ` : ''}{b.page_number}-sahifa
                        </p>
                      </div>
                      <Link
                        href={readUrl}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition-colors"
                      >
                        O‘qish
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions List */}
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-black text-lg text-stone-900">Oxirgi hisob operatsiyalari</h3>
              </div>
              <button
                type="button"
                onClick={() => switchTab('finances')}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
              >
                <span>Batafsil ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">Operatsiyalar tarixi mavjud emas.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{tx.description || tx.transaction_type}</p>
                      <p className="text-[11px] text-stone-400">{formatUzbekDate(tx.created_at)}</p>
                    </div>
                    <span
                      className={clsx(
                        'font-mono font-bold',
                        Number(tx.amount) > 0 ? 'text-emerald-700' : 'text-stone-900',
                      )}
                    >
                      {Number(tx.amount) > 0 ? `+${formatUZS(tx.amount)}` : formatUZS(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE SETTINGS & AVATAR */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black text-lg text-stone-900">Profil ma’lumotlari</h2>
              <p className="text-xs text-stone-500">Shaxsiy identifikatoringiz va ijtimoiy bog‘lanishlaringiz</p>
            </div>
          </div>

          {profileSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
            <div className="relative w-16 h-16 rounded-2xl bg-stone-200 overflow-hidden shrink-0 border border-stone-300">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-500 font-bold text-xl">
                  {profile?.display_name?.slice(0, 1) || 'M'}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-900 block">Profil rasmi (Avatar)</span>
              <p className="text-[11px] text-stone-500">Maksimal 2 MB (PNG, JPEG, WebP)</p>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
                id="avatar-upload-input"
              />
              <label
                htmlFor="avatar-upload-input"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:border-amber-600 text-stone-700 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
              >
                {avatarUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Yuklanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    <span>Rasmni yangilash</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">To‘liq ismingiz</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Foydalanuvchi nomi (username)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Haqingizda (Bio)</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                placeholder="O‘zingiz yoki mutolaa qiziqishlaringiz haqida qisqacha..."
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Telegram username</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={editTelegram}
                  onChange={(e) => setEditTelegram(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="w-full pl-8 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>O‘zgarishlarni saqlash</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: FINANCES & PURCHASES */}
      {activeTab === 'finances' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs">
            <h3 className="font-serif font-black text-lg text-stone-900 mb-4">Balans va to‘ldirishlar</h3>
            <div className="divide-y divide-stone-100">
              {topups.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">To‘ldirish so‘rovlari mavjud emas.</p>
              ) : (
                topups.map((topup) => (
                  <div key={topup.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{formatUZS(topup.amount)}</p>
                      <p className="text-[11px] text-stone-400">{formatUzbekDate(topup.created_at)}</p>
                    </div>
                    <span
                      className={clsx(
                        'px-2.5 py-0.5 rounded-md font-bold text-[11px]',
                        topup.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : topup.status === 'rejected'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200',
                      )}
                    >
                      {topup.status === 'approved' ? 'Tasdiqlangan' : topup.status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs">
            <h3 className="font-serif font-black text-lg text-stone-900 mb-4">Sotib olingan asarlar va boblar</h3>
            <div className="divide-y divide-stone-100">
              {purchases.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">Hozircha sotib olingan asarlar yo‘q.</p>
              ) : (
                purchases.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-stone-900">{p.work?.title || 'Asar'}</p>
                      <p className="text-[11px] text-stone-500">
                        {p.chapter ? `${p.chapter.chapter_number}-bob: ${p.chapter.title}` : 'To‘liq kitob'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-stone-900">{formatUZS(p.gross_amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 shadow-xs">
            <h3 className="font-serif font-black text-lg text-stone-900 mb-4">Hisob operatsiyalari jurnali</h3>
            <TransactionHistoryTable transactions={transactions} />
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-black text-lg text-stone-900">Bildirishnoma sozlamalari</h2>
              <p className="text-xs text-stone-500">Qaysi turdagi xabarnomalarni olishni o‘zingiz boshqaring</p>
            </div>
          </div>

          {notifSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bildirishnoma sozlamalari muvaffaqiyatli yangilandi!</span>
            </div>
          )}

          <form onSubmit={handleSaveNotifs} className="space-y-5">
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Sayt ichidagi bildirishnomalar</h4>
                <p className="text-xs text-stone-500">Yangi boblar, sharhlar va balans o‘zgarishlari haqida bildirishnomalar</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.in_site_news}
                onChange={(e) => setNotifPrefs((p) => ({ ...p, in_site_news: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Aksiyalar va chegirmalar</h4>
                <p className="text-xs text-stone-500">Sevimli asarlaringizdagi chegirmalar va yangi aksiyalar haqida xabardor qilish</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.promotions}
                onChange={(e) => setNotifPrefs((p) => ({ ...p, promotions: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">Email xabarnomalari</h4>
                <p className="text-xs text-stone-500">Haftalik sara asarlar dayjesti va muhim xizmat xabarlari</p>
              </div>
              <input
                type="checkbox"
                checked={notifPrefs.email_marketing}
                onChange={(e) => setNotifPrefs((p) => ({ ...p, email_marketing: e.target.checked }))}
                className="w-5 h-5 accent-amber-600 rounded cursor-pointer mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={savingNotifs}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm"
            >
              {savingNotifs ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sozlamalarni saqlash</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          {/* Email Update */}
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              <span>Email manzilini o‘zgartirish</span>
            </h3>
            <p className="text-xs text-stone-500">
              Joriy email: <strong className="text-stone-900 font-mono">{user?.email}</strong>
            </p>

            {emailMsg && (
              <div
                className={clsx(
                  'p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2',
                  emailMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200',
                )}
              >
                {emailMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{emailMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangeEmail} className="space-y-3">
              <input
                type="email"
                placeholder="Yangi email manzilini kiriting..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden font-medium"
                required
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors"
              >
                {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Tasdiqlash xatini yuborish</span>
              </button>
            </form>
          </div>

          {/* Password Update */}
          <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="font-serif font-black text-lg text-stone-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-600" />
              <span>Parolni yangilash</span>
            </h3>

            {passMsg && (
              <div
                className={clsx(
                  'p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2',
                  passMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200',
                )}
              >
                {passMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{passMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Yangi parol (kamida 6 ta belgi)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden"
                required
              />
              <input
                type="password"
                placeholder="Yangi parolni takrorlang"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm focus:bg-white focus:border-amber-600 outline-hidden"
                required
              />
              <button
                type="submit"
                disabled={passLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors"
              >
                {passLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Parolni yangilash</span>
              </button>
            </form>
          </div>

          {/* Session Termination */}
          <div className="bg-white rounded-3xl border border-rose-200/80 p-6 sm:p-8 shadow-xs flex items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">Sessiyani yakunlash</h3>
              <p className="text-xs text-stone-500">Ushbu qurilmadagi hisobingizdan xavfsiz chiqish</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: QUICK LIBRARY LINKS */}
      {activeTab === 'quick_links' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/kutubxona?tab=reading"
            className="p-6 rounded-3xl bg-white border border-[#EAE5DD] hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <Clock className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Mutolaadagi asarlar</h4>
            <p className="text-xs text-stone-500">Oxirgi o‘qiyotgan sahifalaringiz va mutolaa jurnalingiz</p>
          </Link>

          <Link
            href="/kutubxona?tab=bookmarks"
            className="p-6 rounded-3xl bg-white border border-[#EAE5DD] hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <Bookmark className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Xatcho‘plar</h4>
            <p className="text-xs text-stone-500">Belgilab qo‘yilgan aniq sahifalar va boblar</p>
          </Link>

          <Link
            href="/kutubxona?tab=purchased"
            className="p-6 rounded-3xl bg-white border border-[#EAE5DD] hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <Lock className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Sotib olingan asarlar</h4>
            <p className="text-xs text-stone-500">Doimiy kirish huquqiga ega bo‘lgan kitob va boblaringiz</p>
          </Link>

          <Link
            href="/kutubxona?tab=favorite"
            className="p-6 rounded-3xl bg-white border border-[#EAE5DD] hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <Heart className="w-6 h-6 text-rose-600 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Sevimli asarlar</h4>
            <p className="text-xs text-stone-500">Siz sevib mutolaa qiladigan va yurakcha bosgan asarlar</p>
          </Link>

          <Link
            href="/kutubxona?tab=followed_authors"
            className="p-6 rounded-3xl bg-white border border-[#EAE5DD] hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <Users className="w-6 h-6 text-sky-600 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Kuzatilayotgan mualliflar</h4>
            <p className="text-xs text-stone-500">Siz obuna bo‘lgan mualliflar va ularning yangiliklari</p>
          </Link>

          <Link
            href="/muallif-boling"
            className="p-6 rounded-3xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition-colors shadow-xs space-y-2 group"
          >
            <PenTool className="w-6 h-6 text-amber-700 group-hover:scale-110 transition-transform" />
            <h4 className="font-serif font-black text-base text-stone-900">Muallif bo‘ling</h4>
            <p className="text-xs text-stone-600">O‘z kitoblaringizni nashr qiling va 80% daromad oling</p>
          </Link>
        </div>
      )}

      {/* Topup Modal */}
      {isTopupOpen && (
        <TopupModal
          isOpen={isTopupOpen}
          onClose={() => setIsTopupOpen(false)}
          userBalance={balance || 0}
        />
      )}
    </div>
  );
}

export default function KabinetClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
      <KabinetContent />
    </Suspense>
  );
}
