'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  PenTool,
  BookOpen,
  FileDiff,
  CreditCard,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { supabase } from '@/lib/supabase/client';

interface DashboardStats {
  totalUsers: number;
  activeReaders: number;
  approvedAuthors: number;
  pendingAuthorApps: number;
  publishedWorks: number;
  pendingWorkModeration: number;
  pendingRevisionModeration: number;
  totalPurchases: number;
  manualCreditsToday: number;
  pendingPayouts: number;
  platformRevenue: number;
}

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeReaders: 0,
    approvedAuthors: 0,
    pendingAuthorApps: 0,
    publishedWorks: 0,
    pendingWorkModeration: 0,
    pendingRevisionModeration: 0,
    totalPurchases: 0,
    manualCreditsToday: 0,
    pendingPayouts: 0,
    platformRevenue: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const todayIso = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const [
        totalUsersRes,
        activeReadersRes,
        approvedAuthorsRes,
        pendingAuthorAppsRes,
        publishedWorksRes,
        pendingWorksRes,
        pendingRevisionsRes,
        totalPurchasesRes,
        manualCreditsTodayRes,
        pendingPayoutsRes,
        revenueRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('purchases').select('buyer_id', { count: 'exact', head: true }),
        supabase.from('author_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('author_profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('works').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('works').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('work_revisions').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
        supabase.from('purchases').select('id', { count: 'exact', head: true }),
        supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).in('transaction_type', ['topup', 'adjustment']).gt('amount', 0).gte('created_at', todayIso),
        supabase.from('payout_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'under_review']),
        supabase.from('wallet_accounts').select('balance').eq('account_type', 'platform_revenue').maybeSingle(),
      ]);

      setStats({
        totalUsers: totalUsersRes.count || 0,
        activeReaders: activeReadersRes.count || 0,
        approvedAuthors: approvedAuthorsRes.count || 0,
        pendingAuthorApps: pendingAuthorAppsRes.count || 0,
        publishedWorks: publishedWorksRes.count || 0,
        pendingWorkModeration: pendingWorksRes.count || 0,
        pendingRevisionModeration: pendingRevisionsRes.count || 0,
        totalPurchases: totalPurchasesRes.count || 0,
        manualCreditsToday: manualCreditsTodayRes.count || 0,
        pendingPayouts: pendingPayoutsRes.count || 0,
        platformRevenue: Number(revenueRes.data?.balance || 0),
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const totalPendingModeration = stats.pendingWorkModeration + stats.pendingRevisionModeration;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            <span>Boshqaruv Paneli</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manbora platformasining real vaqt ko‘rsatkichlari, moderatsiya holati va moliyaviy oqimlari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStats}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 min-h-[44px]"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Users */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Jami Foydalanuvchilar
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.totalUsers}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Kitobxonlar: {stats.activeReaders} ta xarid qilgan
          </span>
        </div>

        {/* 2. Approved Authors */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Tasdiqlangan Mualliflar
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.approvedAuthors}
          </p>
          <span className="text-[11px] text-amber-700 font-bold mt-1 block">
            {stats.pendingAuthorApps > 0 ? `${stats.pendingAuthorApps} ta ariza kutilmoqda` : 'Barcha arizalar ko‘rilgan'}
          </span>
        </div>

        {/* 3. Published Works */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Nashr Qilingan Asarlar
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {stats.publishedWorks}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Jami xaridlar: {stats.totalPurchases} marta
          </span>
        </div>

        {/* 4. Platform Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Platforma Komissiyasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="font-serif text-xl sm:text-2xl font-black text-purple-900 mt-2 truncate">
            {formatUZS(stats.platformRevenue)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Bugungi to‘ldirishlar: {stats.manualCreditsToday} ta
          </span>
        </div>
      </div>

      {/* Action Required Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Payouts Card */}
        <Link
          href="/diyoration/yechish-sorovlari"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 shadow-sm transition-all group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              stats.pendingPayouts > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-50 text-slate-400'
            }`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Pul Yechish So‘rovlari
              </span>
              <strong className="text-base font-black text-slate-900">
                {stats.pendingPayouts} ta kutilmoqda
              </strong>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        {/* Pending Author Applications */}
        <Link
          href="/diyoration/mualliflar"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-sm transition-all group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              stats.pendingAuthorApps > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-400'
            }`}>
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Mualliflik Arizalari
              </span>
              <strong className="text-base font-black text-slate-900">
                {stats.pendingAuthorApps} ta ariza
              </strong>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
        </Link>

        {/* Pending Moderation */}
        <Link
          href="/diyoration/asarlar"
          className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-purple-400 shadow-sm transition-all group flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              totalPendingModeration > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-50 text-slate-400'
            }`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Asarlar Moderatsiyasi
              </span>
              <strong className="text-base font-black text-slate-900">
                {totalPendingModeration} ta tekshiruvda
              </strong>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Direct Section Shortcuts */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-serif">
          Tezkor Boshqaruv Bo‘limlari
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { href: '/diyoration/foydalanuvchilar', title: 'Foydalanuvchilar', desc: 'Qidiruv va balans qo‘shish', icon: Users, color: 'text-blue-600' },
            { href: '/diyoration/mualliflar', title: 'Mualliflar', desc: 'Arizalar va gonorarlar', icon: PenTool, color: 'text-amber-600' },
            { href: '/diyoration/asarlar', title: 'Asarlar & Boblar', desc: 'Kitoblar va narxlar', icon: BookOpen, color: 'text-emerald-600' },
            { href: '/diyoration/tahrirlar', title: 'Tahrirlar', desc: 'O‘zgarishlar moderatsiyasi', icon: FileDiff, color: 'text-indigo-600' },
            { href: '/diyoration/yechish-sorovlari', title: 'Pul Yechish', desc: 'Bank kartasiga to‘lov', icon: CreditCard, color: 'text-rose-600' },
            { href: '/diyoration/moliya', title: 'Moliyaviy Registr', desc: 'O‘zgarmas hamyon daftari', icon: DollarSign, color: 'text-emerald-700' },
            { href: '/diyoration/audit', title: 'Audit Jurnali', desc: 'Ma’muriy harakatlar tarixi', icon: ShieldCheck, color: 'text-purple-600' },
            { href: '/diyoration/settings', title: 'Sozlamalar', desc: 'Komissiya va platforma', icon: Wallet, color: 'text-slate-600' },
          ].map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.href}
                href={sec.href}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                  <Icon className={`w-5 h-5 ${sec.color}`} />
                </div>
                <div>
                  <strong className="text-xs sm:text-sm font-black text-slate-900 block group-hover:text-blue-600 transition-colors">
                    {sec.title}
                  </strong>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {sec.desc}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 pb-20 animate-pulse">
          <div className="h-10 w-72 rounded-xl bg-slate-200" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="h-32 rounded-3xl bg-slate-200" />
            <div className="h-32 rounded-3xl bg-slate-200" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
