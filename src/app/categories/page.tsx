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

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Grid className="w-7 h-7 text-sky-600" />
          <span>Kategoriyalar katalogi</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Barcha sohalar bo‘yicha O‘zbekiston tashkilotlari va xizmatlari ro‘yxati
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const IconComponent = (cat.icon && iconMap[cat.icon]) || Building2;
          return (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="directory-card p-6 flex flex-col justify-between group hover:border-sky-500"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {cat.organization_count || 0} ta
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-sky-600 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
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
