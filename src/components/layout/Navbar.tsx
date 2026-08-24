'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Trophy, Calendar, Star, Info, Home, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Bosh sahifa', icon: Home },
    { href: '/matches', label: 'O‘yinlar', icon: Calendar },
    { href: '/competitions', label: 'Musobaqalar', icon: Trophy },
    { href: '/favorites', label: 'Sevimlilar', icon: Star },
    { href: '/about', label: 'Biz haqimizda', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              ⚽
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                Futbol Natija
              </span>
              <span className="text-[10px] text-emerald-400/90 tracking-wider uppercase font-semibold">
                O‘zbekiston
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={clsx(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60',
                  )}
                >
                  <Icon className={clsx('w-4 h-4', isActive ? 'text-emerald-400' : 'text-slate-400')} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label="Menyu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-slate-800/80 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60',
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive ? 'text-emerald-400' : 'text-slate-400')} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
