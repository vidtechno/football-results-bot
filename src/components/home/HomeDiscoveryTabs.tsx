'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, TrendingUp, Clock, Bookmark, Info, Loader2, Users, Compass, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { WorkCard, WorkCardSkeleton } from '@/components/work/WorkCard';
import type { Work } from '@/lib/types/platform';

export type DiscoveryTabKey = 'yangi' | 'siz-uchun' | 'ommabop' | 'kuzatayotganlarim';

interface HomeDiscoveryTabsProps {
  initialWorks?: Work[];
  popularWorks?: Work[];
}

export function HomeDiscoveryTabs({
  initialWorks = [],
  popularWorks = [],
}: HomeDiscoveryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const urlTab = searchParams.get('tab') as DiscoveryTabKey | null;
  const validTab = (urlTab && ['yangi', 'siz-uchun', 'ommabop', 'kuzatayotganlarim'].includes(urlTab))
    ? urlTab
    : 'yangi';

  const [activeTab, setActiveTab] = useState<DiscoveryTabKey>(validTab);
  const [works, setWorks] = useState<Work[]>(validTab === 'yangi' ? initialWorks : validTab === 'ommabop' ? popularWorks : []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();

  // Cache fetched tab results in memory
  const [tabCache, setTabCache] = useState<Record<string, Work[]>>({
    yangi: initialWorks,
    ...(popularWorks.length > 0 ? { ommabop: popularWorks } : {}),
  });

  const fetchTabData = useCallback(async (tab: DiscoveryTabKey) => {
    // If cached, use it immediately
    if (tabCache[tab] && tabCache[tab].length > 0) {
      setWorks(tabCache[tab]);
      setError(null);
      setEmptyReason(null);
      return;
    }

    setLoading(true);
    setError(null);
    setEmptyReason(null);

    try {
      const res = await fetch(`/api/home/discovery?tab=${tab}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.requiresAuth) {
          router.push(`/kirish?returnUrl=${encodeURIComponent(`/?tab=${tab}`)}`);
          return;
        }
        throw new Error(data.error || 'Ma’lumotlarni yuklab bo‘lmadi');
      }

      const fetchedWorks = data.works || [];
      setWorks(fetchedWorks);
      setEmptyReason(data.emptyReason || null);
      setIsPersonalized(Boolean(data.isPersonalized));

      // Update cache
      setTabCache((prev) => ({ ...prev, [tab]: fetchedWorks }));
    } catch (err: any) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }, [tabCache, router]);

  const handleSelectTab = (key: DiscoveryTabKey, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      router.push(`/kirish?returnUrl=${encodeURIComponent(`/?tab=${key}`)}`);
      return;
    }

    setActiveTab(key);

    // Synchronize URL query parameter without full-page refresh
    const url = new URL(window.location.href);
    if (key === 'yangi') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', key);
    }
    window.history.replaceState({}, '', url.toString());

    fetchTabData(key);
  };

  useEffect(() => {
    if (urlTab && urlTab !== 'yangi' && urlTab !== activeTab) {
      handleSelectTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const tabs: { key: DiscoveryTabKey; label: string; icon: any; requiresAuth?: boolean }[] = [
    { key: 'yangi', label: 'Yangi', icon: Clock },
    { key: 'siz-uchun', label: 'Siz uchun', icon: Sparkles },
    { key: 'ommabop', label: 'Ommabop', icon: TrendingUp },
    { key: 'kuzatayotganlarim', label: 'Kuzatayotganlarim', icon: Bookmark, requiresAuth: true },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontal Tabs Row */}
      <div
        role="tablist"
        aria-label="Kashf qilish bo‘limlari"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              type="button"
              onClick={() => handleSelectTab(tab.key, tab.requiresAuth)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 shrink-0 border shadow-2xs cursor-pointer',
                isActive
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-stone-600 border-[#EAE5DD] hover:border-emerald-600/40 hover:text-stone-900 hover:bg-stone-50',
              )}
            >
              <Icon
                className={clsx(
                  'w-3.5 h-3.5',
                  isActive ? 'text-emerald-200' : 'text-stone-400',
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guest Explanation for "Siz uchun" */}
      {activeTab === 'siz-uchun' && !user && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Ommabop tavsiyalar to‘plami:</strong> Siz tizimga kirmagansiz. Sevimli janrlaringiz va o‘qish tarixingiz asosida shaxsiy saralashni olish uchun{' '}
            <Link href="/kirish?returnUrl=/?tab=siz-uchun" className="underline font-bold hover:text-amber-950">
              tizimga kiring
            </Link>.
          </p>
        </div>
      )}

      {/* Panel Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="space-y-4"
      >
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <WorkCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-3">
            <p className="text-xs text-red-600 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => fetchTabData(activeTab)}
              className="px-4 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
            >
              Qayta urinish
            </button>
          </div>
        ) : works.length === 0 ? (
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
            {activeTab === 'kuzatayotganlarim' ? (
              <>
                <Users className="w-8 h-8 text-stone-300 mx-auto" />
                <h3 className="font-serif font-bold text-stone-800 text-sm">
                  Siz hali birorta muallif yoki asarni kuzatmadingiz
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Yangi boblar haqida xabar olish uchun sevimli mualliflaringizni kuzatib boring.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Link
                    href="/mualliflar"
                    className="inline-block px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors"
                  >
                    Mualliflarni ko‘rish
                  </Link>
                  <Link
                    href="/asarlar"
                    className="inline-block px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
                  >
                    Katalog
                  </Link>
                </div>
              </>
            ) : (
              <>
                <BookOpen className="w-8 h-8 text-stone-300 mx-auto" />
                <h3 className="font-serif font-bold text-stone-800 text-sm">
                  Ushbu bo‘limda hozircha asarlar mavjud emas
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Yangi asarlar qo‘shilganda bu yerda ko‘rsatiladi.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
