import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug, searchOrganizations } from '@/lib/db/directory';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchBox } from '@/components/directory/SearchBox';
import { Grid, ArrowLeft } from 'lucide-react';

interface CategoryDetailProps {
  params: {
    slug: string;
  };
}

export const revalidate = 120;

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
      {/* Back button */}
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Barcha kategoriyalarga qaytish</span>
      </Link>

      {/* Category Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold text-xl">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{category.name}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Topilgan tashkilotlar: <strong className="text-slate-800">{organizations.length} ta</strong>
            </p>
          </div>
        </div>
        {category.description && (
          <p className="text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
            {category.description}
          </p>
        )}
      </div>

      {/* Search inside Category */}
      <SearchBox
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
