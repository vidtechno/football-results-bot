'use client';
import React, { useState } from 'react';
import Link from 'next/link';
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
            <div className="relative w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-[#1C1917] flex items-center justify-center text-amber-500 shadow-xs group-hover:scale-102 transition-transform duration-200 shrink-0">
              <BookOpen className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xl sm:text-2xl font-serif font-black text-[#1C1917] tracking-tight leading-none">
                Manbora
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#B45309] font-bold tracking-wider uppercase leading-tight pt-0.5">
                Kitob va mutolaa
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5" aria-label="Asosiy menyu">
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
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150',
                    isActive
                      ? 'bg-[#FEF3C7] text-[#92400E] font-black shadow-2xs'
                      : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC]',
                  )}
                >
                  <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-[#B45309]' : 'text-[#A8A29E]')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {user && (
              <Link
                href="/kutubxona"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150',
                  pathname.startsWith('/kutubxona') || pathname.includes('tab=library')
                    ? 'bg-[#FEF3C7] text-[#92400E] font-black shadow-2xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC]',
                )}
              >
                <Bookmark className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>Kutubxonam</span>
              </Link>
            )}
          </nav>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Search trigger */}
            <Link
              href="/asarlar"
              className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors"
              title="Asarlarni qidirish"
              aria-label="Qidiruv"
            >
              <Search className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {balance !== null && (
                  <button
                    type="button"
                    onClick={() => setShowTopupModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEF3C7]/80 border border-[#FDE68A] text-[#92400E] text-xs font-bold hover:bg-[#FEF3C7] transition-colors min-h-[36px]"
                    title="Hisobni to‘ldirish"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>{formatUZS(balance)}</span>
                  </button>
                )}

                {/* Author workspace shortcut if author is approved */}
                {author && author.status === 'approved' && (
                  <Link
                    href="/muallif"
                    className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors"
                    title="Mualliflik kabineti"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#B45309]" />
                    <span>Ijodxona</span>
                  </Link>
                )}

                {/* Verified Admin Panel button (strictly for allowlisted admin) */}
                {isAdmin && (
                  <Link
                    href="/diyoration"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black shadow-2xs transition-all"
                    title="Manbora Admin Paneli"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span className="hidden sm:inline">Admin paneli</span>
                  </Link>
                )}

                <Link
                  href="/kabinet"
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    pathname.startsWith('/kabinet')
                      ? 'bg-[#1C1917] text-white shadow-xs'
                      : 'bg-[#F5F2EC] text-[#57534E] hover:bg-[#EAE5DD]',
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {profile?.display_name || 'Kabinet'}
                  </span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/kirish"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#78716C]" />
                  <span>Kirish</span>
                </Link>
                <Link
                  href="/royxatdan-otish"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                >
                  <span>Ro‘yxatdan o‘tish</span>
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
