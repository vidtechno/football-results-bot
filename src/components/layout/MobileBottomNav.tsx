'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Compass, Bookmark, User, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase/client';

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkAdmin(sessionUser: any, token?: string) {
      if (sessionUser) {
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
        if (isMounted) setIsAdmin(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdmin(session?.user || null, session?.access_token);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user || null, session?.access_token);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // If on reading page, don't show general bottom nav (reader has its own distraction-free controls)
  if (pathname.includes('/asarlar/') && pathname.split('/').length >= 4) {
    return null;
  }

  const baseTabs = [
    { href: '/', label: 'Bosh sahifa', icon: BookOpen },
    { href: '/asarlar', label: 'Asarlar', icon: Compass },
    { href: '/kutubxona', label: 'Kutubxonam', icon: Bookmark },
    { href: '/kabinet', label: 'Kabinet', icon: User },
  ];

  const tabs = isAdmin
    ? [...baseTabs, { href: '/diyoration', label: 'Admin', icon: ShieldCheck }]
    : baseTabs;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom-nav px-1 py-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))]">
      <nav className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isDiyoration = tab.href === '/diyoration';
          const isActive =
            pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[50px] min-h-[44px]',
                isActive
                  ? isDiyoration ? 'text-purple-700 font-bold' : 'text-amber-950 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium',
              )}
            >
              <div
                className={clsx(
                  'p-1 rounded-lg transition-transform duration-150',
                  isActive
                    ? isDiyoration ? 'bg-purple-100' : 'bg-amber-100/80'
                    : 'bg-transparent',
                )}
              >
                <Icon
                  className={clsx(
                    'w-5 h-5 transition-colors',
                    isActive
                      ? isDiyoration ? 'text-purple-700 stroke-[2.2]' : 'text-amber-900 stroke-[2.2]'
                      : 'text-stone-400 stroke-[1.8]',
                  )}
                />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight leading-none truncate">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
