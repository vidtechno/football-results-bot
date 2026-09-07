'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Bookmark,
  Clock,
  Users,
  Layers,
  Bell,
  Sparkles,
  PlusCircle,
  PenTool,
  ShieldCheck,
  ArrowRight,
  Languages,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/components/providers/NotificationProvider';
import { OnlineUsersBadge } from '@/components/analytics/OnlineUsersBadge';

export function Sidebar({ readerMode = false }: { readerMode?: boolean }) {
  const pathname = usePathname();
  const { user, author, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();

  // Primary navigation links
  const navItems = [
    {
      label: 'Bosh sahifa',
      href: '/',
      icon: BookOpen,
      exact: true,
      requiresAuth: false,
    },
    {
      label: 'Asarlar',
      href: '/asarlar',
      icon: Compass,
      exact: false,
      requiresAuth: false,
    },
    {
      label: 'Tarjima asarlar',
      href: '/tarjima-asarlar',
      icon: Languages,
      exact: false,
      requiresAuth: false,
    },
    {
      label: 'Kutubxonam',
      href: user ? '/kutubxona' : '/kirish?returnUrl=/kutubxona',
      icon: Bookmark,
      exact: false,
      activePattern: '/kutubxona',
      requiresAuth: true,
    },
    {
      label: 'Mutolaani davom ettirish',
      href: user ? '/kutubxona?tab=reading' : '/kirish?returnUrl=/kutubxona?tab=reading',
      icon: Clock,
      exact: false,
      activePattern: '/kutubxona?tab=reading',
      requiresAuth: true,
    },
    {
      label: 'Mualliflar',
      href: '/mualliflar',
      icon: Users,
      exact: false,
      requiresAuth: false,
    },
    {
      label: 'Janrlar',
      href: '/janrlar',
      icon: Layers,
      exact: false,
      requiresAuth: false,
    },
    {
      label: 'Bildirishnomalar',
      href: user ? '/kabinet?tab=notifications' : '/kirish?returnUrl=/kabinet?tab=notifications',
      icon: Bell,
      exact: false,
      badge: unreadCount > 0 ? unreadCount : null,
      requiresAuth: true,
    },
    {
      label: 'Muallif bo‘ling',
      href: '/muallif-boling',
      icon: Sparkles,
      exact: false,
      requiresAuth: false,
    },
  ];

  const isAuthor = Boolean(author && author.status === 'approved');

  return (
    <aside
      className={clsx(
        'hidden lg:flex flex-col w-[240px] shrink-0 border-r border-[#EAE5DD] bg-[#FAF8F5]/80 backdrop-blur-sm sticky overflow-y-auto px-3.5 py-4 select-none justify-between',
        readerMode ? 'top-0 h-screen' : 'top-[72px] h-[calc(100vh-72px)]',
      )}
      aria-label="Asosiy yon menyu"
    >
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[10.5px] font-black uppercase tracking-wider text-stone-600 mb-1.5">
            Menyu
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : item.activePattern
                ? pathname.startsWith(item.activePattern)
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                    isActive
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60',
                  )}
                  title={item.label}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={clsx(
                        'w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
                        isActive ? 'text-white' : 'text-stone-600 group-hover:text-stone-900',
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge ? (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] leading-none shrink-0 shadow-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Role-Aware Additions */}
        {(isAuthor || isAdmin) && (
          <div className="pt-2 border-t border-[#EAE5DD] space-y-1">
            <p className="px-3 text-[10.5px] font-black uppercase tracking-wider text-stone-600 mb-1.5">
              Boshqaruv
            </p>
            <nav className="space-y-1">
              {isAuthor && (
                <>
                  <Link
                    href="/muallif/asar/yangi"
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group',
                      pathname === '/muallif/asar/yangi'
                        ? 'bg-emerald-800 text-white font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60',
                    )}
                  >
                    <PlusCircle className="w-4 h-4 text-amber-700 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Asar yaratish</span>
                  </Link>
                  <Link
                    href="/muallif"
                    className={clsx(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all group',
                      pathname === '/muallif' || pathname.startsWith('/muallif/analitika')
                        ? 'bg-emerald-800 text-white font-bold shadow-xs'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60',
                    )}
                  >
                    <PenTool className="w-4 h-4 text-emerald-800 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Muallif studiyasi</span>
                  </Link>
                </>
              )}

              {isAdmin && (
                <Link
                  href="/diyoration"
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all group',
                    pathname.startsWith('/diyoration')
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-blue-800 hover:bg-blue-50',
                  )}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-700 group-hover:scale-110 transition-transform" />
                  <span className="truncate">Admin paneli</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Bottom Compact Author CTA Card */}
      <div className="pt-4 border-t border-[#EAE5DD]">
        <div className="px-2 pb-3"><OnlineUsersBadge /></div>
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#FAF8F5] via-emerald-50/40 to-emerald-100/30 border border-emerald-200/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-900">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="text-[11px] font-black tracking-tight">Mualliflarga</span>
          </div>
          <p className="text-[11px] font-bold text-stone-900 leading-tight">
            Hikoyangizni kitobxonlar bilan bo‘lishing
          </p>
          <p className="text-[10.5px] text-stone-600 leading-snug">
            Asaringizni nashr qiling, auditoriya to‘plang va daromad qiling.
          </p>
          <Link
            href={isAuthor ? '/muallif/asar/yangi' : '/muallif-boling'}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] transition-colors shadow-2xs group"
          >
            <span>{isAuthor ? 'Yangi asar yaratish' : 'Muallif bo‘lish'}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
