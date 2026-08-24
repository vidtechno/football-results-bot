import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://manbora.uz'),
  title: {
    default: 'Manbora — O‘zbekistondagi tashkilotlar aloqa katalogi',
    template: '%s | Manbora',
  },
  description: 'Manbora orqali banklar, davlat tashkilotlari, xizmatlar, telefon raqamlari, rasmiy saytlar va mobil ilovalarni tez toping.',
  keywords: [
    'telefon raqamlari',
    'tashkilotlar',
    'banklar',
    'davlat xizmatlari',
    'ishonch telefoni',
    'O‘zbekiston',
    'rasmiy saytlar',
    'mobil ilovalar',
    'Manbora',
    'manbora.uz',
  ],
  authors: [{ name: 'Manbora Platformasi', url: 'https://manbora.uz' }],
  creator: 'Manbora',
  publisher: 'Manbora',
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: 'https://manbora.uz',
    siteName: 'Manbora',
    title: 'Manbora — O‘zbekistondagi tashkilotlar aloqa katalogi',
    description: 'Manbora orqali banklar, davlat tashkilotlari, xizmatlar, telefon raqamlari, rasmiy saytlar va mobil ilovalarni tez toping.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manbora — O‘zbekistondagi tashkilotlar aloqa katalogi',
    description: 'Manbora orqali banklar, davlat tashkilotlari, xizmatlar, telefon raqamlari, rasmiy saytlar va mobil ilovalarni tez toping.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className={`${inter.variable}`}>
      <body className="bg-background text-slate-900 min-h-screen flex flex-col antialiased">
        <Navbar />
        {/* pb-28 ensures bottom navigation on mobile never covers content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}
