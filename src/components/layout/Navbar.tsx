'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Grid, MapPin, Info, Home, PhoneCall, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Bosh sahifa', icon: Home },
    { href: '/search', label: 'Qidiruv', icon: Search },
    { href: '/categories', label: 'Kategoriyalar', icon: Grid },
    { href: '/regions', label: 'Viloyatlar', icon: MapPin },
    { href: '/about', label: 'Biz haqimizda', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Geometric Brand Logo Mark */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform duration-200">
              <PhoneCall className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Bog‘lanish
              </span>
              <span className="text-[10px] text-blue-600 tracking-widest uppercase font-extrabold">
                Aloqa Katalogi
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70',
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTA Action Button & Mobile Compact Action */}
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Qidiruv</span>
            </Link>

            {/* Mobile Top Compact Search Button */}
            <Link
              href="/search"
              className="sm:hidden p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold"
              aria-label="Qidirish"
            >
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
