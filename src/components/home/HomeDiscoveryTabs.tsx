'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Bookmark,
  Info,
  Users,
  BookOpen,
  RotateCcw,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { WorkCard, WorkCardSkeleton } from '@/components/work/WorkCard';
import type { Work } from '@/lib/types/platform';

export type DiscoveryTabKey = 'yangi' | 'siz-uchun' | 'ommabop' | 'kuzatayotganlarim';

const VALID_TABS: DiscoveryTabKey[] = ['yangi', 'siz-uchun', 'ommabop', 'kuzatayotganlarim'];

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
  const { user, isLoading: authLoading } = useAuth();

  const urlTab = searchParams.get('tab') as DiscoveryTabKey | null;
  const initialTab: DiscoveryTabKey = urlTab && VALID_TABS.includes(urlTab) ? urlTab : 'yangi';

  const [activeTab, setActiveTab] = useState<DiscoveryTabKey>(initialTab);
  const [works, setWorks] = useState<Work[]>(
    initialTab === 'yangi' && initialWorks.length > 0
      ? initialWorks
      : initialTab === 'ommabop' && popularWorks.length > 0
        ? popularWorks
        : [],
  );
  const [loading, setLoading] = useState<boolean>(
    initialTab === 'siz-uchun' ||
      initialTab === 'kuzatayotganlarim' ||
      (initialTab === 'yangi' && initialWorks.length === 0) ||
      (initialTab === 'ommabop' && popularWorks.length === 0),
  );
  const [error, setError] = useState<string | null>(null);
  const [emptyReason, setEmptyReason] = useState<string | null>(null);
  const [tabCache, setTabCache] = useState<Record<string, Work[]>>({
    ...(initialWorks.length > 0 ? { yangi: initialWorks } : {}),
    ...(popularWorks.length > 0 ? { ommabop: popularWorks } : {}),
  });

  const requestIdRef = useRef<number>(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const loadTabData = useCallback(
    async (tab: DiscoveryTabKey, forceFetch = false) => {
      const requestId = ++requestIdRef.current;

      // Check client memory cache unless forced
      if (!forceFetch && tabCache[tab] && tabCache[tab].length > 0) {
        setWorks(tabCache[tab]);
        setLoading(false);
        setError(null);
        setEmptyReason(null);
        return;
      }

      setLoading(true);
      setError(null);
      setEmptyReason(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/home/discovery?tab=${tab}`, { headers });
        const data = await res.json();

        // Discard stale responses from older requests
        if (requestId !== requestIdRef.current) return;

        if (!res.ok || !data.success) {
          if (data.requiresAuth) {
            setWorks([]);
            setEmptyReason('guest');
            return;
          }
          throw new Error(data.error || 'Ma’lumotlarni yuklab bo‘lmadi');
        }

        const fetchedWorks: Work[] = data.works || [];
        setWorks(fetchedWorks);
        setEmptyReason(data.emptyReason || null);

        if (fetchedWorks.length > 0) {
          setTabCache((prev) => ({ ...prev, [tab]: fetchedWorks }));
        }
      } catch (err: any) {
        if (requestId === requestIdRef.current) {
          setError(err.message || 'Xatolik yuz berdi');
          setWorks([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [tabCache],
  );

  // Initial fetch on mount or if direct landing on non-cached tab
  useEffect(() => {
    if (initialTab === 'yangi' && initialWorks.length > 0) {
      setWorks(initialWorks);
      setLoading(false);
    } else if (initialTab === 'ommabop' && popularWorks.length > 0) {
      setWorks(popularWorks);
      setLoading(false);
    } else {
      loadTabData(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const currentUrl = new URL(window.location.href);
      const tabParam = currentUrl.searchParams.get('tab') as DiscoveryTabKey | null;
      const targetTab: DiscoveryTabKey =
        tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'yangi';
      setActiveTab(targetTab);
      loadTabData(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [loadTabData]);

  const handleSelectTab = (key: DiscoveryTabKey) => {
    if (key === activeTab && !error) return;

    setActiveTab(key);

    const url = new URL(window.location.href);
    url.searchParams.set('tab', key);
    window.history.pushState({ tab: key }, '', url.toString());

    loadTabData(key);
  };

  // Keyboard navigation for accessible tabs
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tabKeys: DiscoveryTabKey[] = ['yangi', 'siz-uchun', 'ommabop', 'kuzatayotganlarim'];
    let nextIndex = -1;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (index + 1) % tabKeys.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (index - 1 + tabKeys.length) % tabKeys.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabKeys.length - 1;
    }

    if (nextIndex >= 0) {
      const nextKey = tabKeys[nextIndex];
      handleSelectTab(nextKey);
      tabsRef.current[nextIndex]?.focus();
    }
  };

  const tabs: { key: DiscoveryTabKey; label: string; icon: any }[] = [
    { key: 'yangi', label: 'Yangi', icon: Clock },
    { key: 'siz-uchun', label: 'Siz uchun', icon: Sparkles },
    { key: 'ommabop', label: 'Ommabop', icon: TrendingUp },
    { key: 'kuzatayotganlarim', label: 'Kuzatayotganlarim', icon: Bookmark },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontal Tabs Row with strict WAI-ARIA tablist */}
      <div
        role="tablist"
        aria-label="Kashf qilish bo‘limlari"
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none"
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabsRef.current[idx] = el;
              }}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => handleSelectTab(tab.key)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 shrink-0 border shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2',
                isActive
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-white text-stone-600 border-[#EAE5DD] hover:border-emerald-600/40 hover:text-stone-900 hover:bg-stone-50',
              )}
            >
              <Icon
                className={clsx('w-3.5 h-3.5', isActive ? 'text-emerald-200' : 'text-stone-400')}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Guest info banner for "Siz uchun" */}
      {activeTab === 'siz-uchun' && !user && !authLoading && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Ommabop tavsiyalar to‘plami:</strong> Siz tizimga kirmagansiz. Sevimli
            janrlaringiz va o‘qish tarixingiz asosida shaxsiy saralashni olish uchun{' '}
            <Link
              href={`/kirish?returnUrl=${encodeURIComponent('/?tab=siz-uchun')}`}
              className="underline font-bold hover:text-amber-950"
            >
              tizimga kiring
            </Link>
            .
          </p>
        </div>
      )}

      {/* Mutually Exclusive Tabpanel States */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="space-y-4"
      >
        {/* State 1: Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <WorkCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          /* State 2: Error with Retry */
          <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-xs space-y-3">
            <p className="text-xs text-red-600 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => loadTabData(activeTab, true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Qayta urinish</span>
            </button>
          </div>
        ) : works.length === 0 ? (
          /* State 3: Empty State with Contextual Explanation & CTAs */
          <div className="p-8 sm:p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-4">
            {activeTab === 'siz-uchun' ? (
              <div className="max-w-md mx-auto space-y-3">
                <Sparkles className="w-9 h-9 text-amber-500 mx-auto" />
                <h3 className="font-sans font-black text-stone-900 text-base sm:text-lg">
                  Hozircha sizga mos tavsiyalar topilmadi
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Sevimli janrlaringizni tanlang yoki ko‘proq asar o‘qib, tavsiyalarni yaxshilang.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Link
                    href="/kabinet"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shadow-2xs"
                  >
                    <span>Janrlarni tanlash</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/asarlar"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
                  >
                    <span>Barcha asarlarni ko‘rish</span>
                  </Link>
                </div>
              </div>
            ) : activeTab === 'kuzatayotganlarim' ? (
              emptyReason === 'guest' || !user ? (
                <div className="max-w-md mx-auto space-y-3">
                  <LogIn className="w-9 h-9 text-emerald-600 mx-auto" />
                  <h3 className="font-sans font-black text-stone-900 text-base sm:text-lg">
                    Kuzatuvlaringizni ko‘rish uchun tizimga kiring
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Kuzatayotgan asarlaringiz va mualliflaringiz yangilanishlarini ko‘rish uchun
                    profilingizga kiring.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Link
                      href={`/kirish?returnUrl=${encodeURIComponent('/?tab=kuzatayotganlarim')}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors shadow-2xs"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Tizimga kirish</span>
                    </Link>
                    <Link
                      href="/asarlar"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
                    >
                      <span>Asarlarni ko‘rish</span>
                    </Link>
                  </div>
                </div>
              ) : emptyReason === 'only_ineligible' ? (
                <div className="max-w-md mx-auto space-y-3">
                  <Bookmark className="w-9 h-9 text-stone-400 mx-auto" />
                  <h3 className="font-sans font-black text-stone-900 text-base sm:text-lg">
                    Kuzatayotganlaringizda yangi asarlar yo‘q
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Siz kuzatayotgan asarlar hozircha ochiq emas yoki yangi boblar chop etilmagan.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Link
                      href="/asarlar"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors shadow-2xs"
                    >
                      <span>Asarlarni ko‘rish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/mualliflar"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
                    >
                      <span>Mualliflarni ko‘rish</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <Users className="w-9 h-9 text-stone-400 mx-auto" />
                  <h3 className="font-sans font-black text-stone-900 text-base sm:text-lg">
                    Siz hali birorta muallif yoki asarni kuzatmadingiz
                  </h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Yangi boblar va asarlar haqida birinchilardan bo‘lib xabar olish uchun sevimli
                    mualliflaringizni kuzatib boring.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Link
                      href="/mualliflar"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors shadow-2xs"
                    >
                      <span>Mualliflarni ko‘rish</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/asarlar"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs hover:bg-stone-200 transition-colors"
                    >
                      <span>Asarlarni ko‘rish</span>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <BookOpen className="w-9 h-9 text-stone-300 mx-auto" />
                <h3 className="font-sans font-black text-stone-900 text-base sm:text-lg">
                  Ushbu bo‘limda hozircha asarlar mavjud emas
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Yangi asarlar chop etilganda bu yerda ko‘rsatiladi.
                </p>
                <div className="pt-2">
                  <Link
                    href="/asarlar"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors"
                  >
                    <span>Barcha asarlarni ko‘rish</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* State 4: Valid Results Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4.5">
            {works.slice(0, 6).map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
