import React from 'react';
import { getCategories, getRegions, searchOrganizations } from '@/lib/db/directory';
import { SearchBox } from '@/components/directory/SearchBox';
import { OrganizationCard } from '@/components/directory/OrganizationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Filter, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

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

  const [categories, regions, results] = await Promise.all([
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
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <Search className="w-7 h-7 text-sky-600" />
            <span>Tashkilotlar qidiruvi</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Nomi, sohasi, viloyati yoki telefon raqami bo‘yicha qidiring
          </p>
        </div>

        <SearchBox initialValue={query} size="normal" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>Filtrlash</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Kategoriya</label>
            <form method="GET" action="/search">
              {query && <input type="hidden" name="q" value={query} />}
              {regionSlug && <input type="hidden" name="region" value={regionSlug} />}
              {verifiedOnly && <input type="hidden" name="verified" value="true" />}
              <select
                name="category"
                defaultValue={categorySlug}
                // @ts-expect-error server component auto-submit
                onChange="this.form.submit()"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
              >
                <option value="">Barcha kategoriyalar</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.organization_count || 0})
                  </option>
                ))}
              </select>
            </form>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Viloyat / Hudud</label>
            <form method="GET" action="/search">
              {query && <input type="hidden" name="q" value={query} />}
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
              {verifiedOnly && <input type="hidden" name="verified" value="true" />}
              <select
                name="region"
                defaultValue={regionSlug}
                // @ts-expect-error server component auto-submit
                onChange="this.form.submit()"
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
              >
                <option value="">Barcha viloyatlar</option>
                {regions.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name} ({r.organization_count || 0})
                  </option>
                ))}
              </select>
            </form>
          </div>

          {/* Verified Toggle */}
          <div className="flex items-end">
            <Link
              href={{
                pathname: '/search',
                query: {
                  ...(query ? { q: query } : {}),
                  ...(categorySlug ? { category: categorySlug } : {}),
                  ...(regionSlug ? { region: regionSlug } : {}),
                  ...(verifiedOnly ? {} : { verified: 'true' }),
                },
              }}
              className={clsx(
                'w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold border transition-colors',
                verifiedOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
              )}
            >
              <CheckCircle2 className={clsx('w-4 h-4', verifiedOnly ? 'text-emerald-600' : 'text-slate-400')} />
              <span>Faqat tasdiqlanganlar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Topilgan tashkilotlar: <strong className="text-slate-900 font-bold">{results.length} ta</strong></span>
        {(query || categorySlug || regionSlug || verifiedOnly) && (
          <Link href="/search" className="text-sky-600 hover:underline">
            Filtrlarni tozalash
          </Link>
        )}
      </div>

      {/* Results Grid */}
      {results.length === 0 ? (
        <EmptyState
          title="Tashkilotlar topilmadi"
          description={
            query
              ? `“${query}” bo‘yicha hech qanday natija topilmadi. Qidiruv so‘zini o‘zgartirib ko‘ring.`
              : 'Tanlangan filtrlar bo‘yicha faol tashkilotlar topilmadi.'
          }
          icon="search"
          action={
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700"
            >
              Barcha tashkilotlarni ko‘rish
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((org) => (
            <OrganizationCard key={org.slug} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}
