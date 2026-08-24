import React from 'react';
import type { Metadata } from 'next';
import { getCategories, getRegions, searchOrganizations } from '@/lib/db/directory';
import { SearchPageClient } from '@/components/directory/SearchPageClient';

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    region?: string;
    verified?: string;
    type?: string;
    digital?: string;
  };
}

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Qidiruv — Manbora tashkilotlar katalogi',
  description: 'Manbora orqali banklar, davlat idoralari, mobil operatorlar va xizmatlarni qidiring va aloqa raqamlarini bir zumda toping.',
  alternates: {
    canonical: 'https://manbora.uz/search',
  },
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const categorySlug = searchParams.category || '';
  const regionSlug = searchParams.region || '';
  const verifiedOnly = searchParams.verified === 'true';
  const organizationType = searchParams.type || '';
  const hasDigitalServicesOnly = searchParams.digital === 'true';

  const [categories, regions, initialOrganizations] = await Promise.all([
    getCategories(),
    getRegions(),
    searchOrganizations({
      query,
      categorySlug,
      regionSlug,
      verifiedOnly,
      organizationType,
      hasDigitalServicesOnly,
    }),
  ]);

  return (
    <SearchPageClient
      initialOrganizations={initialOrganizations}
      categories={categories}
      regions={regions}
      initialQuery={query}
      initialCategory={categorySlug}
      initialRegion={regionSlug}
      initialVerified={verifiedOnly}
      initialType={organizationType}
    />
  );
}
