'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { GenreOnboardingModal } from '@/components/onboarding/GenreOnboardingModal';

export function PublicAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Reader layout: keep desktop navigation and mobile bottom navigation visible.
  const segments = pathname.split('/').filter(Boolean);
  const isReaderPage = segments[0] === 'asarlar' && segments.length >= 3;

  if (isReaderPage) {
    return (
      <div className="min-h-screen w-full flex bg-[#FAF8F5]">
        <Sidebar readerMode />
        <div className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</div>
        <MobileBottomNav />
      </div>
    );
  }

  // 2. Admin Panel: /diyoration/* has its own dedicated AdminLayout
  const isAdminPage = pathname.startsWith('/diyoration');
  if (isAdminPage) {
    return <>{children}</>;
  }

  // 3. Author Studio: /muallif/* retains studio-focused navigation
  const isAuthorStudio = pathname === '/muallif' || pathname.startsWith('/muallif/');
  if (isAuthorStudio) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
        <GenreOnboardingModal />
      </div>
    );
  }

  // 4. Standard Desktop & Mobile Public Shell
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">
      {/* Sticky Top Header (72-76px high) */}
      <Navbar />

      {/* Shell Body: Desktop Left Sidebar + Right Main Content Area */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto min-w-0">
        {/* Fixed/Sticky Left Sidebar on Desktop (>=1024px) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-12">
            {children}
          </main>
          <Footer />
        </div>
      </div>

      {/* Fixed Bottom Navigation for Mobile & Tablet */}
      <MobileBottomNav />

      {/* First-visit Genre Onboarding Modal */}
      <GenreOnboardingModal />
    </div>
  );
}
