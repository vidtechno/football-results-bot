import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { UnifiedAuthCard } from '@/components/auth/UnifiedAuthCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ro‘yxatdan o‘tish',
  description: 'Manbora platformasida ro‘yxatdan o‘ting va sara asarlar mutolaasini boshlang.',
  alternates: {
    canonical: 'https://manbora.uz/kirish?mode=register',
  },
};

interface RoyxatdanOtishPageProps {
  searchParams?: Promise<{
    redirect?: string;
    returnUrl?: string;
    role?: 'author' | 'reader';
  }>;
}

export default async function RoyxatdanOtishPage({ searchParams }: RoyxatdanOtishPageProps) {
  const resolvedSearchParams = await searchParams;
  const profile = await getCurrentProfile();
  const rawRedirect = resolvedSearchParams?.redirect || resolvedSearchParams?.returnUrl;
  const safeRedirect = getSafeRedirectUrl(rawRedirect, '/kabinet');

  if (profile) {
    redirect(safeRedirect);
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
        <UnifiedAuthCard initialRedirect={safeRedirect} defaultMode="register" />
      </Suspense>
    </div>
  );
}
