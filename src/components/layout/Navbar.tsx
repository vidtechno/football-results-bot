'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, PenTool, User, Wallet, LogIn, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function checkUser(sessionUser: any, token?: string) {
      setUser(sessionUser);
      if (sessionUser) {
        fetchBalance(sessionUser.id);
        try {
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch('/api/auth/profile', { headers });
          if (res.ok) {
            const data = await res.json();
            setIsAdmin(Boolean(data.isAdmin));
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        setBalance(null);
        setIsAdmin(false);
      }
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUser(session?.user || null, session?.access_token);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUser(session?.user || null, session?.access_token);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function fetchBalance(userId: string) {
    try {
      const { data } = await supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('user_id', userId)
        .eq('account_type', 'reader_credit')
        .single();

      if (data) {
        setBalance(Number(data.balance));
      }
    } catch {
      // Ignore wallet fetch errors
    }
  }

  const navLinks = [
    { href: '/', label: 'Bosh sahifa', icon: BookOpen },
    { href: '/asarlar', label: 'Asarlar', icon: Compass },
    { href: '/muallif', label: 'Muallif bo‘limi', icon: PenTool },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Manbora Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0" aria-label="Manbora Bosh Sahifa">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 flex items-center justify-center text-white font-black shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform duration-200 flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[22px] sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                Manbora
              </span>
              <span className="text-[10px] text-blue-600 tracking-wide font-extrabold uppercase leading-tight pt-0.5 truncate">
                Kitob va asarlar platformasi
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Asosiy menyu">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70',
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Account / Balance & Login Action */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {balance !== null && (
                  <Link
                    href="/kabinet"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-blue-700 text-xs font-extrabold hover:bg-blue-100 transition-colors"
                    title="Manbora balansingiz"
                  >
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatUZS(balance)}</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/diyoration"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black shadow-2xs transition-all"
                    title="Manbora Admin Paneli"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span className="hidden sm:inline">Admin paneli</span>
                  </Link>
                )}

                <Link
                  href="/kabinet"
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    pathname.startsWith('/kabinet')
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Kabinet</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/kirish"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  <LogIn className="w-4 h-4 text-slate-500" />
                  <span>Kirish</span>
                </Link>
                <Link
                  href="/royxatdan-otish"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all"
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
