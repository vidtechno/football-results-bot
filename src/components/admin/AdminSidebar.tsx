'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminNotificationBell } from './AdminNotificationBell';
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  MapPin,
  Flag,
  PlusCircle,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AdminSidebarProps {
  username?: string;
  role?: string;
}

export function AdminSidebar({ username = 'diyoration', role = 'owner' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/diyoration');
    router.refresh();
  };

  const navItems = [
    { label: 'Boshqaruv paneli', href: '/diyoration/dashboard', icon: LayoutDashboard },
    { label: 'Tashkilotlar reestri', href: '/diyoration/organizations', icon: Building2 },
    { label: 'Kategoriyalar', href: '/diyoration/categories', icon: FolderTree },
    { label: 'Viloyatlar / Hududlar', href: '/diyoration/regions', icon: MapPin },
    { label: 'Tashkilot Takliflari', href: '/diyoration/suggestions', icon: PlusCircle },
    { label: 'Xabarnomalar / Moderatorlik', href: '/diyoration/reports', icon: Flag },
    { label: 'Foydalanuvchilar & Rollar', href: '/diyoration/users', icon: Users },
    { label: 'Sozlamalar & Audit', href: '/diyoration/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between flex-shrink-0 min-h-screen hidden md:flex">
      <div className="p-6 space-y-6">
        {/* Brand Header & Notification Bell */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center font-black shadow-md shadow-blue-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-base">Bog‘lanish</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">ADMIN</span>
              </div>
              <span className="text-[11px] text-slate-400 font-bold block">Boshqaruv Tizimi</span>
            </div>
          </div>

          <AdminNotificationBell />
        </div>

        {/* Admin Profile Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black text-slate-900 block truncate">{username}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>{role}</span>
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <Icon className={clsx('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200/80 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Tizimdan chiqish</span>
        </button>
      </div>
    </aside>
  );
}
