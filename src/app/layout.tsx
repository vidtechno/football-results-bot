import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthProvider } from '@/components/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-source-serif',
  display: 'swap',
  weight: ['400', '600', '700', '900'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://manbora.uz'),
  title: {
    default: 'Manbora — O‘zbek kitob va davomli asarlar platformasi',
    template: '%s | Manbora',
  },
  description:
    'Manbora — zamonaviy o‘zbek kitobxonlari va mualliflari platformasi. Badiiy asarlar, hikoyalar, qissalarni onlayn o‘qing, yangi boblarni kutib oling hamda o‘z asarlaringizni nashr qiling.',
  keywords: [
    'manbora',
    'kitoblar',
    'hikoyalar',
    'qissalar',
    'o‘zbek adabiyoti',
    'elektron kitoblar',
    'mutolaa',
    'muallif',
    'kitobxon',
  ],
  authors: [{ name: 'Manbora Jamoasi', url: 'https://manbora.uz' }],
  creator: 'Manbora',
  publisher: 'Manbora',
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: 'https://manbora.uz',
    siteName: 'Manbora',
    title: 'Manbora — O‘zbek kitob va davomli asarlar platformasi',
    description:
      'Kitoblarni onlayn o‘qing, sevimli mualliflaringizni qo‘llab-quvvatlang va o‘z asarlaringizdan daromad toping.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manbora — O‘zbek kitob va davomli asarlar platformasi',
    description:
      'Kitoblarni onlayn o‘qing, sevimli mualliflaringizni qo‘llab-quvvatlang va o‘z asarlaringizdan daromad toping.',
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
    <html lang="uz" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="bg-background text-stone-900 min-h-screen flex flex-col antialiased selection:bg-amber-100 selection:text-amber-950">
        <AuthProvider>
          <Navbar />
          {/* pb-24 ensures bottom navigation on mobile/tablet never covers content with env(safe-area-inset-bottom) */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
            {children}
          </main>
          <Footer />
          <MobileBottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
