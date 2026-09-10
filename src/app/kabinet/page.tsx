import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import KabinetClient from './KabinetClient';
import { redirect } from 'next/navigation';

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

export default async function KabinetPage({ searchParams }: { searchParams?: { tab?: string } }) {
  if (
    searchParams?.tab &&
    ['profile', 'finances', 'purchases', 'transactions', 'security', 'notifications'].includes(
      searchParams.tab,
    )
  ) {
    const tab = ['purchases', 'transactions'].includes(searchParams.tab)
      ? 'finances'
      : searchParams.tab;
    redirect(`/sozlamalar?tab=${tab}`);
  }
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}
    >
      <KabinetClient />
    </Suspense>
  );
}
