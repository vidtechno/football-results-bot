import type { Metadata } from 'next';
import KabinetClient from '@/app/kabinet/KabinetClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Sozlamalar',
  description: 'Profil, xaridlar, balans va xavfsizlik sozlamalari.',
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <KabinetClient mode="settings" />;
}
