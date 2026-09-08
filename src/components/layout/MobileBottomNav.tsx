'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search, Bookmark, Bell, User, PenTool, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { NOTIFICATIONS_ENABLED } from '@/lib/config/features';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, author } = useAuth();
  const { unreadCount } = useNotifications();
  const isAuthor = Boolean(author && author.status === 'approved');

  // Also hide inside admin panel (/diyoration)
  if (pathname.startsWith('/diyoration')) {
    return null;
  }

  // 5 exact required mobile tabs
  const tabs = [
    {
      href: '/',
      label: 'Bosh sahifa',
      icon: BookOpen,
      exact: true,
    },
    {
      href: '/qidiruv',
      label: 'Qidiruv',
      icon: Search,
      exact: false,
    },
    {
      href: user ? '/kutubxona' : '/kirish?returnUrl=/kutubxona',
      label: 'Kutubxona',
      icon: Bookmark,
      exact: false,
      activePattern: '/kutubxona',
    },
    ...(NOTIFICATIONS_ENABLED
      ? [
          {
            href: user ? '/kabinet?tab=notifications' : '/kirish?returnUrl=/kabinet?tab=notifications',
            label: 'Bildirishnomalar',
            icon: Bell,
            exact: false,
            activePattern: '/kabinet?tab=notifications',
            badge: unreadCount > 0 ? unreadCount : null,
          },
        ]
      : []),
    {
      href: isAuthor ? '/muallif' : '/muallif-boling',
      label: isAuthor ? 'Muallif kabineti' : 'Muallif bo‘lish',
      icon: isAuthor ? PenTool : Sparkles,
      exact: false,
      activePattern: '/muallif',
    },
    {
      href: user ? '/kabinet' : '/kirish',
      label: 'Profil',
      icon: User,
      exact: false,
      activePattern: user ? '/kabinet' : '/kirish',
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#EAE5DD] shadow-lg transition-transform"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobil pastki menyu"
    >
      <div
        className="grid items-center h-14 max-w-lg mx-auto px-1"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : tab.activePattern
            ? pathname.startsWith(tab.activePattern)
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={clsx(
                'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95 select-none relative',
                isActive
                  ? 'text-emerald-900 font-black'
                  : 'text-stone-500 hover:text-stone-900',
              )}
            >
              <div
                className={clsx(
                  'p-1 rounded-lg transition-colors relative',
                  isActive && 'bg-emerald-100/80 text-emerald-900',
                )}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5',
                    isActive ? 'text-emerald-900' : 'text-stone-500',
                  )}
                />
                {tab.badge ? (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-3.5 rounded-full bg-amber-500 text-stone-950 font-black text-[9px] flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-bold tracking-tight leading-none truncate max-w-[62px]',
                  isActive ? 'text-emerald-950 font-black' : 'text-stone-500',
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
