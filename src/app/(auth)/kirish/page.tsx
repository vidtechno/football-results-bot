import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getSafeRedirectUrl } from '@/lib/utils/redirect';
import { KirishForm } from '@/components/auth/KirishForm';

export const dynamic = 'force-dynamic';

interface KirishPageProps {
  searchParams?: {
    redirect?: string;
  };
}

export default async function KirishPage({ searchParams }: KirishPageProps) {
  const profile = await getCurrentProfile();
  const rawRedirect = searchParams?.redirect;
  const safeRedirect = getSafeRedirectUrl(rawRedirect, profile?.is_admin ? '/diyoration' : '/kabinet');

  // If user is already authenticated
  if (profile) {
    // If verified admin visits /kirish with redirect to admin panel, send them directly to /diyoration
    if (profile.is_admin && (rawRedirect === '/diyoration' || rawRedirect?.startsWith('/diyoration/'))) {
      redirect('/diyoration');
    }
    // Otherwise redirect to the requested safe internal route or kabinet
    redirect(safeRedirect);
  }

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Yuklanmoqda...</div>}>
        <KirishForm initialRedirect={safeRedirect} />
      </Suspense>
    </div>
  );
}
