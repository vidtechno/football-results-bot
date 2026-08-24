import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug, searchOrganizations } from '@/lib/db/directory';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { RealtimeSearchBox } from '@/components/directory/RealtimeSearchBox';
import { Grid, ArrowLeft } from 'lucide-react';

interface CategoryDetailProps {
  params: {
    slug: string;
  };
}

export const revalidate = 120;

export async function generateMetadata({ params }: CategoryDetailProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) {
    return {
      title: 'Kategoriya topilmadi | Manbora',
    };
  }

  const title = `${category.name} tashkilotlari va telefon raqamlari — Manbora`;
  const description = category.description
    ? `${category.name}: ${category.description}`
    : `O‘zbekistondagi ${category.name} sohasidagi tashkilotlar, aloqa raqamlari va rasmiy xizmatlari ro‘yxati.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://manbora.uz/categories/${category.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `https://manbora.uz/categories/${category.slug}`,
      siteName: 'Manbora',
    },
  };
}

export default async function CategoryDetailPage({ params }: CategoryDetailProps) {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  const organizations = await searchOrganizations({
    categorySlug: category.slug,
  });

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Barcha kategoriyalarga qaytish</span>
      </Link>

      {/* Category Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{category.name}</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Topilgan tashkilotlar: <strong className="text-slate-900 font-bold">{organizations.length} ta</strong>
            </p>
          </div>
        </div>
        {category.description && (
          <p className="text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100 font-medium">
            {category.description}
          </p>
        )}
      </div>

      {/* Real-time Search inside Category */}
      <RealtimeSearchBox
        placeholder={`${category.name} bo‘limida qidiruv...`}
      />

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <EmptyState
          title="Ushbu kategoriyada tashkilotlar topilmadi"
          description="Hozircha ushbu bo‘limga yangi tashkilotlar biriktirilmagan."
          icon="building"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <OrganizationCard key={org.slug} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}
