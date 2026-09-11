import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PublicAppShell } from '@/components/layout/PublicAppShell';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { NotificationProvider } from '@/components/providers/NotificationProvider';
import { AnalyticsTracker } from '@/components/analytics/AnalyticsTracker';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_SITE_VERIFICATION,
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
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Manbora — o‘zbek kitoblari va hikoyalari platformasi',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manbora — O‘zbek kitob va davomli asarlar platformasi',
    description:
      'Kitoblarni onlayn o‘qing, sevimli mualliflaringizni qo‘llab-quvvatlang va o‘z asarlaringizdan daromad toping.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable}>
      <body className="bg-background text-stone-900 min-h-screen flex flex-col antialiased selection:bg-amber-100 selection:text-amber-950">
        <AuthProvider>
          <NotificationProvider>
            <AnalyticsTracker />
            <ServiceWorkerRegistration />
            <PublicAppShell>{children}</PublicAppShell>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
