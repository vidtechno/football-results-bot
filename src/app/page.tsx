import React from 'react';
import Link from 'next/link';
import { getHomeData } from '@/lib/db/directory';
import { SearchBox } from '@/components/directory/SearchBox';
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
  Search,
  CheckCircle2,
} from 'lucide-react';

export const revalidate = 300;

// Dynamic Lucide Icon Mapper
const iconMap: Record<string, React.ElementType> = {
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
};

export default async function HomePage() {
  const { categories, featuredOrgs, totalOrganizations } = await getHomeData();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-b from-sky-900 via-blue-900 to-slate-900 text-white p-6 sm:p-12 overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-200 text-xs font-semibold">
            <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
            <span>O‘zbekiston Tashkilotlari Aloqa Portali</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Rasmiy telefon raqamlari va manzillarni oson toping
          </h1>

          <p className="text-sky-100 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Banklar, davlat idoralari, mobil operatorlar, tibbiyot markazlari va kommunal xizmatlarning tasdiqlangan aloqa ma’lumotlari.
          </p>

          {/* Large Hero Search */}
          <div className="pt-2">
            <SearchBox size="large" placeholder="Tashkilot yoki xizmatni qidiring (masalan, NBU, Beeline, Soliq)..." />
          </div>

          {/* Quick Search Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-sky-200">
            <span className="font-semibold text-slate-300">Tezkor qidiruv:</span>
            <Link href="/search?q=NBU" className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">NBU Bank</Link>
            <Link href="/search?q=Beeline" className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Beeline</Link>
            <Link href="/search?q=Soliq" className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Soliq qidiruvi</Link>
            <Link href="/search?q=1154" className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">1154 (Elektr)</Link>
            <Link href="/search?q=Express24" className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Express24</Link>
          </div>
        </div>
      </section>

      {/* Popular Categories Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Ommabop kategoriyalar</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Soha bo‘yicha kerakli tashkilotni tanlang</p>
          </div>
          <Link href="/categories" className="text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            <span>Barcha kategoriyalar</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.slice(0, 8).map((cat) => {
            const IconComponent = (cat.icon && iconMap[cat.icon]) || Building2;
            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="directory-card p-4 flex items-center gap-3.5 group hover:border-sky-500"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-sky-600 transition-colors truncate">
                    {cat.name}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {cat.organization_count || 0} ta tashkilot
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Verified Organizations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>Tasdiqlangan tashkilotlar</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Eng ko‘p murojaat qilinadigan muassasalar aloqa ma’lumotlari
            </p>
          </div>
          <Link href="/search" className="text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
            <span>Barchasini ko‘rish</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredOrgs.length === 0 ? (
          <EmptyState
            title="Tashkilotlar topilmadi"
            description="Bazada hozircha faol tashkilotlar mavjud emas."
            icon="building"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredOrgs.map((org) => (
              <OrganizationCard key={org.slug} organization={org} />
            ))}
          </div>
        )}
      </section>

      {/* Platform Features & Explanation */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Nega aynan “Bog‘lanish” platformasi?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Biz O‘zbekistondagi fuqarolar va tadbirkorlar uchun eng ishonchli va doimiy yangilanib turadigan aloqa katalogini taqdim etamiz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-base">Tezkor qo‘ng‘iroq</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Birgina bosish orqali call-markazlar va qisqa ishonch raqamlariga to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qilish imkoniyati.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              ✅
            </div>
            <h3 className="font-bold text-slate-900 text-base">Rasmiy manbalar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Telegram kanallar, rasmiy saytlar, ijtimoiy tarmoqlar va geografik joylashuv manzillari saralangan holda beriladi.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              🔍
            </div>
            <h3 className="font-bold text-slate-900 text-base">Foydalanuvchilar nazorati</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O‘zgargan yoki eskirgan telefon raqamlarini birgina tugma orqali bildirib, ma’lumotlarni yangilashga hissa qo‘shing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
