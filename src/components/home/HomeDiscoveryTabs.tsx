'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, TrendingUp, Clock, Bookmark, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';

export type DiscoveryTabKey = 'yangi' | 'siz-uchun' | 'ommabop' | 'kuzatayotganlarim';

interface HomeDiscoveryTabsProps {
  activeTab?: DiscoveryTabKey;
  onTabChange?: (tab: DiscoveryTabKey) => void;
}

export function HomeDiscoveryTabs({
  activeTab: controlledTab,
  onTabChange,
}: HomeDiscoveryTabsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [internalTab, setInternalTab] = useState<DiscoveryTabKey>('yangi');

  const activeTab = controlledTab ?? internalTab;

  const tabs: { key: DiscoveryTabKey; label: string; icon: any; requiresAuth?: boolean }[] = [
    { key: 'yangi', label: 'Yangi', icon: Clock },
    { key: 'siz-uchun', label: 'Siz uchun', icon: Sparkles },
    { key: 'ommabop', label: 'Ommabop', icon: TrendingUp },
    { key: 'kuzatayotganlarim', label: 'Kuzatayotganlarim', icon: Bookmark, requiresAuth: true },
  ];

  const handleSelectTab = (key: DiscoveryTabKey, requiresAuth?: boolean) => {
    if (requiresAuth && !user) {
      router.push('/kirish?returnUrl=/');
      return;
    }
    setInternalTab(key);
    onTabChange?.(key);
  };

  return (
    <div className="space-y-3">
      {/* Horizontal Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleSelectTab(tab.key, tab.requiresAuth)}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-150 shrink-0 border shadow-2xs cursor-pointer',
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
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Shaxsiy tavsiyalar:</strong> Ro‘yxatdan o‘tganingizda sevimli janrlaringiz va o‘qish tarixingiz asosida sizga mos asarlar saralab ko‘rsatiladi.{' '}
            <Link href="/kirish?returnUrl=/" className="underline font-bold hover:text-amber-950">
              Kirish yoki ro‘yxatdan o‘tish
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
