'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Grid, MapPin, Info } from 'lucide-react';
import { clsx } from 'clsx';

export function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: 'Bosh sahifa', icon: Home },
    { href: '/search', label: 'Qidiruv', icon: Search },
    { href: '/categories', label: 'Kategoriyalar', icon: Grid },
    { href: '/regions', label: 'Viloyatlar', icon: MapPin },
    { href: '/about', label: 'Biz haqimizda', icon: Info },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom-nav px-1 py-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))]">
      <nav className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-200 min-w-[50px] min-h-[44px]',
                isActive
                  ? 'text-blue-600 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-semibold',
              )}
            >
              <div
                className={clsx(
                  'p-1 rounded-lg transition-transform duration-200',
                  isActive ? 'bg-blue-50 scale-105' : 'bg-transparent',
                )}
              >
                <Icon
                  className={clsx(
                    'w-4.5 h-4.5 transition-colors',
                    isActive ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]',
                  )}
                />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
