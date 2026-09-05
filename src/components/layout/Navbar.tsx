'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Book,
  Flame,
  Bookmark,
  Users,
  Search,
  User,
  Wallet,
  LogIn,
  ShieldCheck,
  PenTool,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatUZS } from '@/lib/utils/currency';
import { useAuth } from '@/components/providers/AuthProvider';
import { TopupModal } from '@/components/wallet/TopupModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, author, balance, isAdmin, isLoading, signOut } = useAuth();
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // Distinct desktop destinations (Phase 3 & 4)
  const navLinks = [
    { href: '/', label: 'Bosh sahifa', exact: true },
    { href: '/asarlar', label: 'Asarlar', exact: false },
    { href: '/kitoblar', label: 'Kitoblar', exact: false },
    { href: '/hikoyalar', label: 'Davomli hikoyalar', exact: false },
    { href: '/janrlar', label: 'Janrlar', exact: false },
    { href: '/mualliflar', label: 'Mualliflar', exact: false },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-[#EAE5DD]/80 bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0" aria-label="Manbora Bosh Sahifa">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#FAF8F5] border border-[#E7E2D9] flex items-center justify-center p-1.5 shadow-2xs group-hover:scale-102 group-hover:border-amber-400/60 transition-all duration-200 shrink-0">
              <Image
                src="/brand/manbora-mark.svg"
                alt="Manbora"
                width={24}
                height={24}
                className="w-5.5 h-5.5 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col justify-center select-none">
              <span className="text-lg sm:text-xl font-black text-[#1C1917] tracking-tight leading-none whitespace-nowrap">
                Manbora
              </span>
              <span className="hidden sm:block text-[8.5px] sm:text-[9.5px] text-[#B45309] font-bold tracking-wider uppercase leading-tight pt-0.5 whitespace-nowrap">
                Kitob va mutolaa
              </span>
            </div>
          </Link>

          {/* Desktop Primary Navigation Links (Single Line) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 shrink-0" aria-label="Asosiy menyu">
            {navLinks.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-[#FEF3C7] text-[#92400E] font-black shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC]',
                  )}
                >
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Controls & Secondary Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
            {/* Quick Search trigger */}
            <Link
              href="/qidiruv"
              className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Qidiruv"
              aria-label="Qidiruv"
            >
              <Search className="w-4 h-4" />
            </Link>

            {/* In-Site Notification Bell */}
            <NotificationBell />

            {isLoading ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 animate-pulse">
                <div className="w-16 h-8 rounded-xl bg-stone-200/70" />
                <div className="w-8 h-8 rounded-full bg-stone-200/70" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Balance Wallet Pill */}
                {balance !== null && (
                  <button
                    id="navbar-balance-btn"
                    type="button"
                    onClick={() => setShowTopupModal(true)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FEF3C7]/80 border border-[#FDE68A] text-[#92400E] text-xs font-bold hover:bg-[#FEF3C7] transition-colors min-h-[36px] whitespace-nowrap shrink-0"
                    title="Hisobni to‘ldirish"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                    <span className="whitespace-nowrap">{formatUZS(balance)}</span>
                  </button>
                )}

                {/* Profile & Overflow Dropdown Menu */}
                <div className="relative shrink-0" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((prev) => !prev)}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl text-stone-700 hover:bg-stone-100 transition-colors min-h-[36px] shrink-0"
                    aria-label="Foydalanuvchi menyusi"
                  >
                    <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs uppercase shrink-0">
                      {(profile?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-xs font-bold text-stone-800 max-w-[100px] truncate">
                      {profile?.display_name || user.email?.split('@')[0] || 'Kabinet'}
                    </span>
                    <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-stone-400 shrink-0" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                      <div className="px-3.5 py-2 border-b border-stone-100 bg-stone-50/70">
                        <p className="font-bold text-stone-900 truncate">
                          {profile?.display_name || 'Foydalanuvchi'}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/kabinet"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                        >
                          <User className="w-4 h-4 text-stone-400" />
                          <span>Mening kabinetim</span>
                        </Link>
                        <Link
                          href="/kutubxona"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                        >
                          <Bookmark className="w-4 h-4 text-stone-400" />
                          <span>Kutubxonam</span>
                        </Link>
                        {author && author.status === 'approved' && (
                          <Link
                            href="/muallif"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2 px-3.5 py-2 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                          >
                            <PenTool className="w-4 h-4 text-amber-600" />
                            <span>Ijodxona (Mualliflik)</span>
                          </Link>
                        )}
                        {isAdmin && (
                          <Link
                            href="/diyoration"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2 px-3.5 py-2 text-blue-700 hover:bg-blue-50 transition-colors font-bold"
                          >
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            <span>Admin paneli</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-1 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-700 hover:bg-rose-50 transition-colors font-semibold"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Chiqish</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Link
                  href="/kirish"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors min-h-[36px] shadow-2xs whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Kirish</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <TopupModal
          isOpen={showTopupModal}
          onClose={() => setShowTopupModal(false)}
          userBalance={balance || 0}
        />
      )}
    </header>
  );
}
