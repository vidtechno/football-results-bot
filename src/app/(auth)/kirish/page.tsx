import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { UnifiedAuthCard } from '@/components/auth/UnifiedAuthCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Kirish va Ro‘yxatdan o‘tish | Manbora',
  description: 'Manbora platformasiga kirish yoki yangi hisob yaratish. Barcha kitob va hikoyalaringiz yagona xavfsiz hisobda.',
  alternates: {
    canonical: 'https://manbora.uz/kirish',
  },
};

interface KirishPageProps {
  searchParams?: {
    redirect?: string;
    returnUrl?: string;
    mode?: 'login' | 'register';
    role?: 'author' | 'reader';
  };
}

export default async function KirishPage({ searchParams }: KirishPageProps) {
  const profile = await getCurrentProfile();
  const rawRedirect = searchParams?.redirect || searchParams?.returnUrl;
  const safeRedirect = getSafeRedirectUrl(rawRedirect, profile?.is_admin ? '/diyoration' : '/kabinet');

  // If user is already authenticated
  if (profile) {
    if (profile.is_admin && (rawRedirect === '/diyoration' || rawRedirect?.startsWith('/diyoration/'))) {
      redirect('/diyoration');
    }
    redirect(safeRedirect);
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
        <UnifiedAuthCard
          initialRedirect={safeRedirect}
          defaultMode={searchParams?.mode === 'register' ? 'register' : 'login'}
        />
      </Suspense>
    </div>
  );
}
