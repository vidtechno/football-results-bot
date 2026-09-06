import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentProfile } from '@/lib/supabase/server';
import KabinetClient from './KabinetClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Shaxsiy kabinet',
  description: 'Foydalanuvchining shaxsiy profili, xaridlari, balansi va xavfsizlik sozlamalari.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function KabinetPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/kirish?returnUrl=%2Fkabinet');
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
      <KabinetClient />
    </Suspense>
  );
}
