'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, CreditCard, BookOpen, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export function AdminMobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Boshqaruv', href: '/diyoration/dashboard', icon: LayoutDashboard },
    { label: 'To‘ldirish', href: '/diyoration/dashboard?tab=topups', icon: Wallet },
    { label: 'Pul yechish', href: '/diyoration/dashboard?tab=payouts', icon: CreditCard },
    { label: 'Moderatsiya', href: '/diyoration/dashboard?tab=works', icon: BookOpen },
    { label: 'Sozlamalar', href: '/diyoration/settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom-nav px-2 py-2">
      <nav className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href.split('?')[0];

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all',
                isActive ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              <div
                className={clsx(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400',
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
