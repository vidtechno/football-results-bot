'use client';

import React, { useEffect, useState } from 'react';
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
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkUser(sessionUser: any, token?: string) {
      if (!isMounted) return;
      setUser(sessionUser);

      if (sessionUser) {
        // Fetch balance
        try {
          const { data } = await supabase
            .from('wallet_accounts')
            .select('balance')
            .eq('user_id', sessionUser.id)
            .eq('account_type', 'reader_credit')
            .maybeSingle();

          if (data && isMounted) {
            setBalance(Number(data.balance));
          }
        } catch {
          // ignore
        }

        // Fetch admin status
        try {
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('/api/auth/profile', { headers });
          if (res.ok && isMounted) {
            const data = await res.json();
            setIsAdmin(Boolean(data.isAdmin));
          }
        } catch {
          if (isMounted) setIsAdmin(false);
        }
      } else {
        if (isMounted) {
          setBalance(null);
          setIsAdmin(false);
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUser(session?.user || null, session?.access_token);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user || null, session?.access_token);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const navLinks = [
    { href: '/', label: 'Bosh sahifa', icon: BookOpen },
    { href: '/asarlar', label: 'Asarlar', icon: Compass },
    { href: '/asarlar#janrlar', label: 'Janrlar', icon: Bookmark },
    { href: '/mualliflar', label: 'Mualliflar', icon: Users },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Manbora Literary Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group min-w-0" aria-label="Manbora Bosh Sahifa">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500 font-black shadow-xs group-hover:scale-103 transition-transform duration-200 flex-shrink-0">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-xl sm:text-2xl font-serif font-black text-stone-900 tracking-tight leading-none">
                Manbora
              </span>
              <span className="text-[10px] text-amber-900 tracking-wider font-semibold uppercase leading-tight pt-0.5 truncate">
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
                      ? 'bg-amber-100/70 text-amber-950 font-black'
                      : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100',
                  )}
                >
                  <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-amber-800' : 'text-stone-400')} />
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
                    ? 'bg-amber-100/70 text-amber-950 font-black'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100',
                )}
              >
                <Bookmark className="w-3.5 h-3.5 text-stone-400" />
                <span>Kutubxonam</span>
              </Link>
            )}
          </nav>

          {/* Quick Search & User Area */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Quick Search trigger */}
            <Link
              href="/asarlar"
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              title="Asarlarni qidirish"
              aria-label="Qidiruv"
            >
              <Search className="w-4 h-4" />
            </Link>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {balance !== null && (
                  <Link
                    href="/kabinet"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-950 text-xs font-bold hover:bg-amber-100 transition-colors"
                    title="Manbora hisobingiz"
                  >
                    <Wallet className="w-3.5 h-3.5 text-amber-800" />
                    <span>{formatUZS(balance)}</span>
                  </Link>
                )}

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
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200',
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Kabinet</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/kirish"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-stone-500" />
                  <span>Kirish</span>
                </Link>
                <Link
                  href="/royxatdan-otish"
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all"
                >
                  <span>Ro‘yxatdan o‘tish</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
