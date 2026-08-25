import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCategoryBySlug, getCategoryOrganizationsPaginated } from '@/lib/db/directory';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { RealtimeSearchBox } from '@/components/directory/RealtimeSearchBox';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { Grid, ArrowLeft } from 'lucide-react';

interface CategoryDetailProps {
  params: {
    slug: string;
  };
  searchParams?: {
    page?: string;
  };
}

export const revalidate = 60;

export async function generateMetadata({ params, searchParams }: CategoryDetailProps): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);
  if (!category) {
    return {
      title: 'Kategoriya topilmadi | Manbora',
    };
  }

  const rawPage = parseInt(searchParams?.page || '1', 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const title = page > 1
    ? `${category.name} (Sahifa ${page}) — Manbora`
    : `${category.name} tashkilotlari va telefon raqamlari — Manbora`;
  
  const description = category.description
    ? `${category.name}: ${category.description}`
    : `O‘zbekistondagi ${category.name} sohasidagi tashkilotlar, aloqa raqamlari va rasmiy xizmatlari ro‘yxati.`;

  const canonicalUrl = page > 1
    ? `https://manbora.uz/categories/${category.slug}?page=${page}`
    : `https://manbora.uz/categories/${category.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Manbora',
    },
  };
}

export default async function CategoryDetailPage({ params, searchParams }: CategoryDetailProps) {
  const rawPage = parseInt(searchParams?.page || '1', 10);
  const requestedPage = isNaN(rawPage) ? 1 : rawPage;

  // Safe lower bound redirect
  if (requestedPage < 1) {
    redirect(`/categories/${params.slug}`);
  }

  const { data: organizations, category, totalCount, totalPages, currentPage, startIndex, endIndex } =
    await getCategoryOrganizationsPaginated(params.slug, requestedPage, 20);

  if (!category) {
    notFound();
  }

  // Safe upper bound redirect
  if (requestedPage > totalPages && totalPages > 0) {
    redirect(totalPages === 1 ? `/categories/${params.slug}` : `/categories/${params.slug}?page=${totalPages}`);
  }

  const rangeText = totalCount === 0
    ? '0 ta tashkilot'
    : `${startIndex}–${endIndex} / ${totalCount} ta tashkilot`;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Back link */}
      <Link
        href="/categories"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1"
      >
        <ArrowLeft className="w-4 h-4 text-slate-400" />
        <span>Barcha kategoriyalarga qaytish</span>
      </Link>

      {/* Category Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold flex-shrink-0">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">{category.name}</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5">
              Natija: <strong className="text-slate-900 font-bold">{rangeText}</strong>
            </p>
          </div>
        </div>
        {category.description && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100 font-medium">
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {organizations.map((org) => (
              <OrganizationCard key={org.slug} organization={org} />
            ))}
          </div>

          {/* Server-side Pagination Controls */}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl={`/categories/${category.slug}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
