'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  User,
  Wallet,
  LogIn,
  ShieldCheck,
  PenTool,
  Bookmark,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatUZS } from '@/lib/utils/currency';
import { useAuth } from '@/components/providers/AuthProvider';
import { TopupModal } from '@/components/wallet/TopupModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Navbar() {
  const router = useRouter();
  const { user, profile, author, balance, isAdmin, isLoading, signOut } = useAuth();
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const cabinetHref =
    author?.status === 'approved' && profile?.username
      ? `/mualliflar/${profile.username}`
      : '/kabinet';

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

  // Global keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        } else {
          router.push('/qidiruv');
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/qidiruv?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/qidiruv');
    }
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] glass-header border-b border-[#EAE5DD]/90 bg-[#FAF8F5]/95 backdrop-blur-md transition-all">
      <div className="w-full h-full px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Text-only brand wordmark */}
        <Link
          href="/"
          className="group shrink-0 select-none rounded-xl px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label="Manbora Bosh Sahifa"
        >
          <div className="flex flex-col justify-center">
            <span className="font-sans text-2xl sm:text-[1.7rem] font-black italic text-[#1C1917] tracking-[-0.035em] leading-none transition-colors group-hover:text-emerald-800">
              Manbora
            </span>
            <span className="hidden sm:block text-[9px] text-emerald-800 font-bold tracking-wider uppercase leading-tight pt-0.5">
              Kitob va mutolaa
            </span>
          </div>
        </Link>

        {/* Prominent Global Search Input Form */}
        <div className="flex-1 max-w-xl mx-auto hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Asar, muallif yoki janr qidirish..."
              className="nav-search w-full pl-10 pr-16 py-2.5 rounded-2xl bg-white/90 border border-[#EAE5DD] focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100/70 outline-hidden text-xs text-[#1C1917] placeholder-stone-400 transition-all duration-300 shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-[10px] font-bold text-stone-500">
                ⌘K
              </kbd>
            </div>
          </form>
        </div>

        {/* Right Section: Notification, Wallet Balance, User Menu or Guest Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Quick Search Trigger on Mobile */}
          <Link
            href="/qidiruv"
            className="md:hidden p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Qidiruv"
            aria-label="Qidiruv"
          >
            <Search className="w-4 h-4" />
          </Link>

          {/* In-Site Notification Bell */}
          <NotificationBell />

          {isLoading ? (
            <div className="flex items-center gap-2 shrink-0 animate-pulse">
              <div className="w-20 h-9 rounded-xl bg-stone-200/70" />
              <div className="w-9 h-9 rounded-full bg-stone-200/70" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Wallet Balance Pill */}
              {balance !== null && (
                <button
                  id="navbar-balance-btn"
                  type="button"
                  onClick={() => setShowTopupModal(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold hover:bg-emerald-100/70 transition-all min-h-[40px] whitespace-nowrap shrink-0 shadow-2xs group"
                  title="Hisobni to‘ldirish"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-700 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-extrabold">{formatUZS(balance)}</span>
                </button>
              )}

              {/* Profile Avatar & Menu Dropdown */}
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl text-stone-700 hover:bg-stone-200/60 transition-all min-h-[40px] shrink-0 border border-transparent hover:border-[#EAE5DD]"
                  aria-label="Foydalanuvchi menyusi"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-xs uppercase shrink-0">
                    {(profile?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-xs font-bold text-stone-800 max-w-[110px] truncate">
                    {profile?.display_name || user.email?.split('@')[0] || 'Kabinet'}
                  </span>
                  <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-stone-400 shrink-0" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                    <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50/80">
                      <p className="font-bold text-stone-900 truncate">
                        {profile?.display_name || 'Foydalanuvchi'}
                      </p>
                      <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href={cabinetHref}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                      >
                        <User className="w-4 h-4 text-stone-400" />
                        <span>
                          {author?.status === 'approved' ? 'Mening profilim' : 'Mening kabinetim'}
                        </span>
                      </Link>
                      <Link
                        href="/kutubxona"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                      >
                        <Bookmark className="w-4 h-4 text-stone-400" />
                        <span>Kutubxonam</span>
                      </Link>
                      {author && author.status === 'approved' && (
                        <Link
                          href="/muallif"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-emerald-50 transition-colors font-medium"
                        >
                          <PenTool className="w-4 h-4 text-emerald-700" />
                          <span>Ijodxona (Mualliflik)</span>
                        </Link>
                      )}
                      {isAdmin && (
                        <Link
                          href="/diyoration"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-blue-700 hover:bg-blue-50 transition-colors font-bold"
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
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-700 hover:bg-rose-50 transition-colors font-semibold"
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
                href="/royxatdan-otish"
                className="hidden sm:inline-flex items-center px-3 sm:px-3.5 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 font-bold text-xs border border-[#EAE5DD] transition-colors min-h-[40px] whitespace-nowrap shrink-0"
              >
                <span>Ro‘yxatdan o‘tish</span>
              </Link>
              <Link
                href="/kirish"
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-2xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 transition-colors min-h-[40px] shadow-2xs whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Kirish</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Topup Modal */}
      {showTopupModal && (
        <TopupModal
          isOpen={showTopupModal}
          onClose={() => setShowTopupModal(false)}
          userBalance={balance || 0}
          userName={
            profile?.display_name ||
            user?.user_metadata?.display_name ||
            user?.user_metadata?.full_name ||
            user?.email?.split('@')[0] ||
            'Foydalanuvchi'
          }
          publicId={profile?.public_id || 'Noma’lum'}
          userEmail={user?.email}
        />
      )}
    </header>
  );
}
