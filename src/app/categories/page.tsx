import React from 'react';
import Link from 'next/link';
import { getCategories } from '@/lib/db/directory';
import {
  Grid,
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
  ChevronRight,
} from 'lucide-react';

export const revalidate = 300;

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

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Grid className="w-7 h-7 text-blue-600" />
          <span>Kategoriyalar katalogi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Barcha sohalar bo‘yicha O‘zbekiston tashkilotlari va xizmatlari ro‘yxati
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
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
              className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between group ${style.bg} ${style.border}`}
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm ${style.text} group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-white text-slate-700 shadow-sm border border-slate-200/80">
                    {cat.organization_count || 0} ta
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>Tashkilotlarni ko‘rish</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
