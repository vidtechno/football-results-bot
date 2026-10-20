'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { ADMIN_MOBILE_PRIMARY, ADMIN_NAV_GROUPS } from '@/components/admin/adminNav';
import { useAdminPendingCounts } from '@/components/admin/useAdminPendingCounts';

export function AdminMobileNav() {
  const pathname = usePathname();
  const counts = useAdminPendingCounts();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const allItems = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
  const primary = ADMIN_MOBILE_PRIMARY.map((href) => allItems.find((i) => i.href === href)!).filter(Boolean);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const totalPending = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <strong className="text-sm font-black text-slate-900">Admin menyusi</strong>
              <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-xl bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Yopish">
                <X className="w-4 h-4" />
              </button>
            </div>
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{group.title}</span>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const pending = item.badge ? counts[item.badge] || 0 : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold min-h-[44px]',
                        isActive(item.href) ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{item.label}</span>
                      {pending > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                          {pending}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-bottom-nav px-2 py-2">
        <nav className="flex items-center justify-around" aria-label="Admin asosiy menyu">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all',
                  active ? 'text-blue-600 font-extrabold' : 'text-slate-500 hover:text-slate-900',
                )}
              >
                <div className={clsx('p-1 rounded-lg transition-colors', active ? 'bg-blue-50 text-blue-600' : 'text-slate-400')}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500"
          >
            <div className="p-1 rounded-lg text-slate-400">
              <Menu className="w-5 h-5" />
            </div>
            <span>Menyu</span>
            {totalPending > 0 && (
              <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {totalPending > 99 ? '99+' : totalPending}
              </span>
            )}
          </button>
        </nav>
      </div>
    </>
  );
}
