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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom-nav px-2 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <nav className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[56px]',
                isActive
                  ? 'text-blue-600 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium',
              )}
            >
              <div
                className={clsx(
                  'p-1.5 rounded-xl transition-transform duration-200',
                  isActive ? 'bg-blue-50 scale-110' : 'bg-transparent',
                )}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-blue-600 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]',
                  )}
                />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
