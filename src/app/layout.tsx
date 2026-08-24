import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { getLastSyncTime } from '@/lib/db/queries';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Futbol Natija — O‘zbekiston Futbol Natijalari Portali',
  description: 'O‘zbekiston Superligasi, Premyer-Liga, La Liga, Serie A va Boshqa Top Musobaqalar Futbol Natijalari',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lastSyncTime = await getLastSyncTime();

  return (
    <html lang="uz" className={`${inter.variable} dark`}>
      <body className="bg-background text-slate-100 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <Footer lastSyncTime={lastSyncTime} />
      </body>
    </html>
  );
}
