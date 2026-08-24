import React from 'react';
import Link from 'next/link';
import { getHomeData } from '@/lib/db/directory';
import { RealtimeSearchBox } from '@/components/directory/RealtimeSearchBox';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { EmergencyNumbersBanner } from '@/components/directory/EmergencyNumbersBanner';
import { PopularSearchSection } from '@/components/directory/PopularSearchSection';
import { HomeClientWrapper } from '@/components/directory/HomeClientWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Landmark,
  Building2,
  Smartphone,
  Wifi,
  Truck,
  Car,
  Zap,
  GraduationCap,
  Stethoscope,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  ArrowRight,
  Shield,
  Sparkles,
  CheckCircle2,
  MessageSquareHeart,
} from 'lucide-react';

export const revalidate = 300;

const categoryThemes: Record<
  string,
  { bg: string; text: string; iconBg: string; border: string; icon: React.ElementType }
> = {
  banklar: {
    bg: 'bg-gradient-to-br from-blue-50 to-sky-100/70 hover:from-blue-100 hover:to-sky-200/80',
    text: 'text-blue-700',
    iconBg: 'bg-blue-600 text-white',
    border: 'border-blue-200/80',
    icon: Landmark,
  },
  'davlat-tashkilotlari': {
    bg: 'bg-gradient-to-br from-indigo-50 to-blue-100/70 hover:from-indigo-100 hover:to-blue-200/80',
    text: 'text-indigo-700',
    iconBg: 'bg-indigo-600 text-white',
    border: 'border-indigo-200/80',
    icon: Building2,
  },
  'mobil-operatorlar': {
    bg: 'bg-gradient-to-br from-emerald-50 to-teal-100/70 hover:from-emerald-100 hover:to-teal-200/80',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-600 text-white',
    border: 'border-emerald-200/80',
    icon: Smartphone,
  },
  'internet-provayderlar': {
    bg: 'bg-gradient-to-br from-cyan-50 to-sky-100/70 hover:from-cyan-100 hover:to-sky-200/80',
    text: 'text-cyan-700',
    iconBg: 'bg-cyan-600 text-white',
    border: 'border-cyan-200/80',
    icon: Wifi,
  },
  'yetkazib-berish': {
    bg: 'bg-gradient-to-br from-orange-50 to-amber-100/70 hover:from-orange-100 hover:to-amber-200/80',
    text: 'text-orange-700',
    iconBg: 'bg-orange-600 text-white',
    border: 'border-orange-200/80',
    icon: Truck,
  },
  taksi: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-100/70 hover:from-amber-100 hover:to-yellow-200/80',
    text: 'text-amber-700',
    iconBg: 'bg-amber-600 text-white',
    border: 'border-amber-200/80',
    icon: Car,
  },
  kommunal: {
    bg: 'bg-gradient-to-br from-yellow-50 to-amber-100/70 hover:from-yellow-100 hover:to-amber-200/80',
    text: 'text-yellow-800',
    iconBg: 'bg-amber-500 text-white',
    border: 'border-yellow-300/80',
    icon: Zap,
  },
  talim: {
    bg: 'bg-gradient-to-br from-purple-50 to-indigo-100/70 hover:from-purple-100 hover:to-indigo-200/80',
    text: 'text-purple-700',
    iconBg: 'bg-purple-600 text-white',
    border: 'border-purple-200/80',
    icon: GraduationCap,
  },
  tibbiyot: {
    bg: 'bg-gradient-to-br from-rose-50 to-pink-100/70 hover:from-rose-100 hover:to-pink-200/80',
    text: 'text-rose-700',
    iconBg: 'bg-rose-600 text-white',
    border: 'border-rose-200/80',
    icon: Stethoscope,
  },
  sugurta: {
    bg: 'bg-gradient-to-br from-teal-50 to-emerald-100/70 hover:from-teal-100 hover:to-emerald-200/80',
    text: 'text-teal-700',
    iconBg: 'bg-teal-600 text-white',
    border: 'border-teal-200/80',
    icon: ShieldCheck,
  },
  'tolov-tizimlari': {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100/70 hover:from-green-100 hover:to-emerald-200/80',
    text: 'text-green-700',
    iconBg: 'bg-green-600 text-white',
    border: 'border-green-200/80',
    icon: CreditCard,
  },
  marketpleyslar: {
    bg: 'bg-gradient-to-br from-fuchsia-50 to-pink-100/70 hover:from-fuchsia-100 hover:to-pink-200/80',
    text: 'text-fuchsia-700',
    iconBg: 'bg-fuchsia-600 text-white',
    border: 'border-fuchsia-200/80',
    icon: ShoppingBag,
  },
};

export default async function HomePage() {
  const { categories, regions, featuredOrgs, totalOrganizations } = await getHomeData();

  // WebSite + SearchAction JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Manbora',
    url: 'https://manbora.uz',
    description: 'Manbora — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay katalog.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://manbora.uz/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="space-y-10">
      {/* Inject WebSite JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* High-Impact Hero Section */}
      <section className="relative rounded-3xl bg-mesh-hero text-white p-6 sm:p-12 overflow-hidden shadow-2xl shadow-blue-900/20">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
            <Shield className="w-4 h-4 text-emerald-300" />
            <span>{totalOrganizations}+ ta tekshirilgan va tasdiqlangan aloqa manbalari</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Kerakli tashkilotni tez toping
          </h1>

          <p className="text-sky-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
            Manbora — O‘zbekistondagi banklar, davlat idoralari, mobil operatorlar va favqulodda xizmatlarning rasmiy aloqa ma’lumotlari katalogi.
          </p>

          <div className="pt-2">
            <RealtimeSearchBox
              size="large"
              placeholder="Tashkilot nomi, sohasi, shahar yoki telefon raqami..."
            />
          </div>
        </div>
      </section>

      {/* Static Prominent Emergency Numbers Banner (101, 102, 103, 104, 1050) */}
      <EmergencyNumbersBanner />

      {/* Popular Search Shortcuts Section */}
      <PopularSearchSection />

      {/* Category Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Kategoriyalar bo‘yicha</span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Soha bo‘yicha kerakli tashkilotni tanlang</p>
          </div>
          <Link
            href="/categories"
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            <span>Barchasi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {categories.slice(0, 8).map((cat) => {
            const theme = categoryThemes[cat.slug] || {
              bg: 'bg-gradient-to-br from-blue-50 to-sky-100/70 hover:from-blue-100 hover:to-sky-200/80',
              text: 'text-blue-700',
              iconBg: 'bg-blue-600 text-white',
              border: 'border-blue-200/80',
              icon: Building2,
            };
            const IconComponent = theme.icon;

            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 group shadow-sm ${theme.bg} ${theme.border}`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl ${theme.iconBg} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-bold">
                    {cat.organization_count || 0} ta tashkilot
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Organizations */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Tasdiqlangan Tashkilotlar</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Eng ko‘p murojaat qilinadigan muassasalar va birgina bosishda aloqa
            </p>
          </div>
          <Link
            href="/search"
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            <span>Barcha tashkilotlar</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {featuredOrgs.length === 0 ? (
          <EmptyState
            title="Tashkilotlar topilmadi"
            description="Bazada hozircha faol tashkilotlar mavjud emas."
            icon="building"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {featuredOrgs.map((org) => (
              <OrganizationCard key={org.slug} organization={org} variant="compact" />
            ))}
          </div>
        )}
      </section>

      {/* Home Client Wrapper for Public Suggestion Modal Trigger */}
      <HomeClientWrapper categories={categories} regions={regions} />
    </div>
  );
}
