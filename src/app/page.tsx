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
  Shield,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Flame,
  Clock,
  MessageSquareHeart,
  Phone,
} from 'lucide-react';

export const revalidate = 300;

// Vibrant category theme system
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
  const { categories, featuredOrgs, totalOrganizations } = await getHomeData();

  // Quick emergency/popular short call buttons
  const quickCalls = [
    { label: 'Elektr ta’minoti', phone: '1154', href: 'tel:1154', color: 'bg-amber-500 text-white' },
    { label: 'Hududgaz', phone: '1104', href: 'tel:1104', color: 'bg-orange-500 text-white' },
    { label: 'Davlat xizmatlari', phone: '1148', href: 'tel:1148', color: 'bg-blue-600 text-white' },
    { label: 'Soliq ishonch', phone: '1198', href: 'tel:1198', color: 'bg-indigo-600 text-white' },
    { label: 'Uztelecom', phone: '1084', href: 'tel:1084', color: 'bg-cyan-600 text-white' },
  ];

  return (
    <div className="space-y-12">
      {/* High-Impact Hero Section with Decorative Shapes & Mesh Gradient */}
      <section className="relative rounded-3xl bg-mesh-hero text-white p-6 sm:p-12 overflow-hidden shadow-2xl shadow-blue-900/20">
        {/* Decorative background shapes */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          {/* Trust Counter Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-sm">
            <Shield className="w-4 h-4 text-emerald-300" />
            <span>{totalOrganizations}+ ta rasmiy va tasdiqlangan aloqa manbalari</span>
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
              placeholder="Tashkilot nomi, sohasi, shahar yoki telefon raqami..."
            />
          </div>

          {/* Quick Access Filter Chips */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold text-sky-200">Ommabop sohalar:</span>
            <Link
              href="/categories/banklar"
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm border border-white/10"
            >
              Banklar
            </Link>
            <Link
              href="/categories/kommunal"
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm border border-white/10"
            >
              Kommunal (1154)
            </Link>
            <Link
              href="/categories/mobil-operatorlar"
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm border border-white/10"
            >
              Mobil operatorlar
            </Link>
            <Link
              href="/categories/davlat-tashkilotlari"
              className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-all backdrop-blur-sm border border-white/10"
            >
              Davlat xizmatlari (DXA)
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Service Quick-Actions (Favqulodda & Qisqa raqamlar) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-slate-800">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-base sm:text-lg font-black tracking-tight">Favqulodda & Tezkor Qo‘ng‘iroqlar</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickCalls.map((qc) => (
            <a
              key={qc.phone}
              href={qc.href}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between group active:scale-95"
            >
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-500 block truncate">{qc.label}</span>
                <span className="text-base font-black text-slate-900">{qc.phone}</span>
              </div>
              <div className={`w-8 h-8 rounded-xl ${qc.color} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                <Phone className="w-4 h-4" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Colorful Category Grid */}
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

      {/* “Ko‘p qidiriladiganlar” Compact Card Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Ko‘p qidiriladiganlar</span>
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

      {/* Trust & Value Section (3 Visual Benefit Cards with Modern Badges) */}
      <section className="bg-gradient-to-br from-white via-blue-50/30 to-sky-50/40 rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Nega fuqarolar va tadbirkorlar “Bog‘lanish”ni tanlaydi?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            O‘zbekistondagi eng aniq va doimiy yangilanib boruvchi ochiq aloqa katalogi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Birginada qo‘ng‘iroq</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Call-markaz va ishonch telefonlariga mobil va kompyuterdan tugmani bir bosishda ulaning.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Rasmiy ma’lumotlar</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Davlat idoralari, banklar va operatorlarning faqat rasmiy manbalari hamda ijtimoiy kanallari.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-100 shadow-sm space-y-3">
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
