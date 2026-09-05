'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Search, Bookmark, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // If on reading page, don't show general bottom nav (reader has its own distraction-free controls)
  if (pathname.includes('/asarlar/') && pathname.split('/').length >= 4) {
    return null;
  }

  // 5 distinct, comfortable mobile tabs
  const tabs = [
    { href: '/', label: 'Bosh sahifa', icon: BookOpen, exact: true },
    { href: '/asarlar', label: 'Asarlar', icon: Compass, exact: false },
    { href: '/qidiruv', label: 'Qidiruv', icon: Search, exact: false },
    { href: '/kutubxona', label: 'Kutubxonam', icon: Bookmark, exact: false },
    { href: user ? '/kabinet' : '/kirish', label: 'Profil', icon: User, exact: false },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#EAE5DD] shadow-lg"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobil pastki menyu"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95 select-none',
                isActive
                  ? 'text-[#B45309]'
                  : 'text-[#78716C] hover:text-[#1C1917]',
              )}
            >
              <div className={clsx('p-1 rounded-lg transition-colors', isActive && 'bg-[#FEF3C7]')}>
                <Icon className={clsx('w-5 h-5', isActive ? 'text-[#B45309]' : 'text-[#78716C]')} />
              </div>
              <span className={clsx('text-[10px] font-bold tracking-tight leading-none', isActive ? 'text-[#92400E] font-black' : 'text-[#78716C]')}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
