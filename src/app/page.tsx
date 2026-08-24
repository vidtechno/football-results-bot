import React from 'react';
import Link from 'next/link';
import { getHomeData } from '@/lib/db/directory';
import { RealtimeSearchBox } from '@/components/directory/RealtimeSearchBox';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
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
  PhoneCall,
  CheckCircle2,
  Shield,
  Search,
  Sparkles,
  MessageSquareHeart,
  Clock,
} from 'lucide-react';

export const revalidate = 300;

// Category colorful theme mapping
const categoryStyles: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  banklar: { bg: 'bg-blue-50/90 hover:bg-blue-100/90', text: 'text-blue-600', border: 'border-blue-200/70', icon: Landmark },
  'davlat-tashkilotlari': { bg: 'bg-indigo-50/90 hover:bg-indigo-100/90', text: 'text-indigo-600', border: 'border-indigo-200/70', icon: Building2 },
  'mobil-operatorlar': { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', text: 'text-emerald-600', border: 'border-emerald-200/70', icon: Smartphone },
  'internet-provayderlar': { bg: 'bg-sky-50/90 hover:bg-sky-100/90', text: 'text-sky-600', border: 'border-sky-200/70', icon: Wifi },
  'yetkazib-berish': { bg: 'bg-orange-50/90 hover:bg-orange-100/90', text: 'text-orange-600', border: 'border-orange-200/70', icon: Truck },
  taksi: { bg: 'bg-amber-50/90 hover:bg-amber-100/90', text: 'text-amber-600', border: 'border-amber-200/70', icon: Car },
  kommunal: { bg: 'bg-yellow-50/90 hover:bg-yellow-100/90', text: 'text-yellow-700', border: 'border-yellow-200/70', icon: Zap },
  talim: { bg: 'bg-purple-50/90 hover:bg-purple-100/90', text: 'text-purple-600', border: 'border-purple-200/70', icon: GraduationCap },
  tibbiyot: { bg: 'bg-rose-50/90 hover:bg-rose-100/90', text: 'text-rose-600', border: 'border-rose-200/70', icon: Stethoscope },
  sugurta: { bg: 'bg-teal-50/90 hover:bg-teal-100/90', text: 'text-teal-600', border: 'border-teal-200/70', icon: ShieldCheck },
  'tolov-tizimlari': { bg: 'bg-green-50/90 hover:bg-green-100/90', text: 'text-green-600', border: 'border-green-200/70', icon: CreditCard },
  marketpleyslar: { bg: 'bg-fuchsia-50/90 hover:bg-fuchsia-100/90', text: 'text-fuchsia-600', border: 'border-fuchsia-200/70', icon: ShoppingBag },
};

export default async function HomePage() {
  const { categories, featuredOrgs, totalOrganizations } = await getHomeData();

  return (
    <div className="space-y-12 pb-6">
      {/* Memorable Soft Gradient Hero Section */}
      <section className="relative rounded-3xl hero-gradient text-white p-6 sm:p-12 overflow-hidden shadow-2xl shadow-blue-900/15">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-sky-400/20 blur-2xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          {/* Trust indicator badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
            <Shield className="w-4 h-4 text-emerald-300" />
            <span>{totalOrganizations}+ ta tasdiqlangan aloqa manbalari</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Kerakli tashkilot raqamini bir zumda toping
          </h1>

          <p className="text-sky-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
            Banklar, davlat idoralari, mobil operatorlar va favqulodda xizmatlarning rasmiy ishonch telefonlari hamda manzillari.
          </p>

          {/* Large Real-time Search Box */}
          <div className="pt-2">
            <RealtimeSearchBox
              size="large"
              placeholder="Tashkilot nomi, sohasi, shahar yoki phone raqamini qidiring..."
            />
          </div>

          {/* Quick Access Chips */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold text-sky-200">Ommabop qidiruvlar:</span>
            <Link
              href="/categories/banklar"
              className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm"
            >
              Banklar
            </Link>
            <Link
              href="/categories/kommunal"
              className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm"
            >
              Kommunal (1154)
            </Link>
            <Link
              href="/categories/mobil-operatorlar"
              className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm"
            >
              Mobil operatorlar
            </Link>
            <Link
              href="/categories/davlat-tashkilotlari"
              className="px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm"
            >
              Davlat xizmatlari (DXA)
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Categories Grid with Distinct Soft Colors */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Ommabop kategoriyalar</span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Soha bo‘yicha kerakli tashkilotni tanlang</p>
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
            const style = categoryStyles[cat.slug] || {
              bg: 'bg-blue-50/90 hover:bg-blue-100/90',
              text: 'text-blue-600',
              border: 'border-blue-200/70',
              icon: Building2,
            };
            const IconComponent = style.icon;

            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-center gap-3.5 group ${style.bg} ${style.border}`}
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm ${style.text} group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                    {cat.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {cat.organization_count || 0} ta tashkilot
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* “Ko‘p qidiriladiganlar” Compact Card Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Ko‘p qidiriladiganlar</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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

      {/* Trust & Value Section (3 Visual Benefit Cards with Lucide Icons) */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Nega fuqarolar va tadbirkorlar “Bog‘lanish”ni tanlaydi?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            O‘zbekistondagi eng aniq va doimiy yangilanib boruvchi ochiq aloqa katalogi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50/80 to-slate-50 border border-blue-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Birginada qo‘ng‘iroq</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Call-markaz va ishonch telefonlariga mobil va kompyuterdan tugmani bir bosishda ulaning.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-slate-50 border border-emerald-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Rasmiy ma’lumotlar</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Davlat idoralari, banklar va operatorlarning faqat rasmiy manbalari hamda ijtimoiy kanallari.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/80 to-slate-50 border border-amber-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-600/20">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Tuzatish bildirish</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Eskirgan yoki o‘zgargan telefon raqamini tugma orqali bildirib, katalog aniqligiga hissa qo‘shing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
