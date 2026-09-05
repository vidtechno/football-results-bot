'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Compass,
  Bookmark,
  Users,
  Search,
  User,
  Wallet,
  LogIn,
  ShieldCheck,
  PenTool,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatUZS } from '@/lib/utils/currency';
import { useAuth } from '@/components/providers/AuthProvider';
import { TopupModal } from '@/components/wallet/TopupModal';

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, author, balance, isAdmin } = useAuth();
  const [showTopupModal, setShowTopupModal] = useState(false);

  const navLinks = [
    { href: '/', label: 'Bosh sahifa', icon: BookOpen },
    { href: '/asarlar', label: 'Asarlar', icon: Compass },
    { href: '/asarlar#janrlar', label: 'Janrlar', icon: Bookmark },
    { href: '/mualliflar', label: 'Mualliflar', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-[#EAE5DD]/80 bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Manbora Literary Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0" aria-label="Manbora Bosh Sahifa">
            <div className="relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-[#FAF8F5] border border-[#E7E2D9] flex items-center justify-center p-1.5 shadow-2xs group-hover:scale-102 group-hover:border-amber-400/60 transition-all duration-200 shrink-0">
              <Image
                src="/brand/manbora-mark.svg"
                alt="Manbora"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col justify-center select-none">
              <span className="text-xl sm:text-2xl font-serif font-black text-[#1C1917] tracking-tight leading-none whitespace-nowrap">
                Manbora
              </span>
              <span className="hidden sm:block text-[9px] sm:text-[10px] text-[#B45309] font-bold tracking-wider uppercase leading-tight pt-0.5 whitespace-nowrap">
                Kitob va mutolaa
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0" aria-label="Asosiy menyu">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href.split('#')[0]) && link.href !== '/';

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0',
                    isActive
                      ? 'bg-[#FEF3C7] text-[#92400E] font-black shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC]',
                  )}
                >
                  <Icon className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-[#B45309]' : 'text-[#A8A29E]')} />
                  <span className="whitespace-nowrap">{link.label}</span>
                </Link>
              );
            })}

            {user && (
              <Link
                href="/kutubxona"
                className={clsx(
                  'hidden xl:flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0',
                  pathname.startsWith('/kutubxona') || pathname.includes('tab=library')
                    ? 'bg-[#FEF3C7] text-[#92400E] font-black shadow-2xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC]',
                )}
              >
                <Bookmark className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                <span className="whitespace-nowrap">Kutubxonam</span>
              </Link>
            )}
          </nav>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 shrink-0">
            {/* Quick Search trigger */}
            <Link
              href="/asarlar"
              className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors shrink-0"
              title="Asarlarni qidirish"
              aria-label="Qidiruv"
            >
              <Search className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0">
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

                {/* Author workspace shortcut if author is approved */}
                {author && author.status === 'approved' && (
                  <Link
                    href="/muallif"
                    className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors whitespace-nowrap shrink-0"
                    title="Mualliflik kabineti"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
                    <span className="whitespace-nowrap">Ijodxona</span>
                  </Link>
                )}

                {/* Verified Admin Panel button (strictly for allowlisted admin) */}
                {isAdmin && (
                  <Link
                    href="/diyoration"
                    className="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black shadow-2xs transition-all whitespace-nowrap shrink-0"
                    title="Manbora Admin Paneli"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">
                      <span className="hidden xl:inline">Admin paneli</span>
                      <span className="xl:hidden">Admin</span>
                    </span>
                  </Link>
                )}

                <Link
                  href="/kabinet"
                  className={clsx(
                    'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0',
                    pathname.startsWith('/kabinet')
                      ? 'bg-[#1C1917] text-white shadow-xs'
                      : 'bg-[#F5F2EC] text-[#57534E] hover:bg-[#EAE5DD]',
                  )}
                  title={profile?.display_name || user.email || 'Kabinet'}
                  aria-label={profile?.display_name || 'Kabinet'}
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline-block max-w-[80px] xl:max-w-[120px] truncate">
                    {profile?.display_name || 'Kabinet'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Link
                  href="/kirish"
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-all whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
                  <span className="whitespace-nowrap">Kirish</span>
                </Link>
                <Link
                  href="/royxatdan-otish"
                  className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0"
                >
                  <span className="whitespace-nowrap">Ro‘yxatdan o‘tish</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <TopupModal
        isOpen={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        userBalance={balance ?? 0}
        userName={profile?.display_name || 'Foydalanuvchi'}
        publicId={profile?.public_id || 'MB-00000000'}
        userEmail={user?.email}
      />
    </header>
  );
}
