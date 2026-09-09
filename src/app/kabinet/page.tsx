import React, { Suspense } from 'react';
import type { Metadata } from 'next';
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
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-stone-400">Yuklanmoqda...</div>}>
      <KabinetClient />
    </Suspense>
  );
}
