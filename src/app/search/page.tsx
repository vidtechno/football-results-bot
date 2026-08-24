import React from 'react';
import { getCategories, getRegions, searchOrganizations } from '@/lib/db/directory';
import { SearchPageClient } from '@/components/directory/SearchPageClient';

interface SearchPageProps {
  searchParams: {
    q?: string;
    category?: string;
    region?: string;
    verified?: string;
  };
}

export const revalidate = 60;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || '';
  const categorySlug = searchParams.category || '';
  const regionSlug = searchParams.region || '';
  const verifiedOnly = searchParams.verified === 'true';

  const [categories, regions, initialOrganizations] = await Promise.all([
    getCategories(),
    getRegions(),
    searchOrganizations({
      query,
      categorySlug,
      regionSlug,
      verifiedOnly,
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
    />
  );
}
