'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Category, Region, Organization } from '@/lib/types/directory';
import { RealtimeSearchBox } from './RealtimeSearchBox';
import { OrganizationCard } from './OrganizationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Filter, CheckCircle2, Search, X, Landmark, Building2, Zap, Smartphone } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchPageClientProps {
  initialOrganizations: Organization[];
  categories: Category[];
  regions: Region[];
  initialQuery?: string;
  initialCategory?: string;
  initialRegion?: string;
  initialVerified?: boolean;
  initialType?: string;
}

export function SearchPageClient({
  initialOrganizations,
  categories,
  regions,
  initialQuery = '',
  initialCategory = '',
  initialRegion = '',
  initialVerified = false,
  initialType = '',
}: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [categorySlug, setCategorySlug] = useState(initialCategory);
  const [regionSlug, setRegionSlug] = useState(initialRegion);
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerified);
  const [organizationType, setOrganizationType] = useState(initialType);
  const [hasDigitalServicesOnly, setHasDigitalServicesOnly] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);
  const [loading, setLoading] = useState(false);

  // Sync state when URL searchParams change
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategorySlug(searchParams.get('category') || '');
    setRegionSlug(searchParams.get('region') || '');
    setVerifiedOnly(searchParams.get('verified') === 'true');
    setOrganizationType(searchParams.get('type') || '');
    setHasDigitalServicesOnly(searchParams.get('digital') === 'true');
  }, [searchParams]);

  // Fetch updated data when filters change
  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (categorySlug) params.set('category', categorySlug);
      if (regionSlug) params.set('region', regionSlug);
      if (verifiedOnly) params.set('verified', 'true');
      if (organizationType) params.set('type', organizationType);
      if (hasDigitalServicesOnly) params.set('digital', 'true');

      try {
        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrganizations(data.organizations || []);
        }
      } catch {
        // preserve current
      } finally {
        setLoading(false);
      }
    };

    fetchFiltered();
  }, [query, categorySlug, regionSlug, verifiedOnly, organizationType, hasDigitalServicesOnly]);

  const updateUrl = (
    newCategory: string,
    newRegion: string,
    newVerified: boolean,
    newType: string,
    newDigital: boolean,
  ) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (newCategory) params.set('category', newCategory);
    if (newRegion) params.set('region', newRegion);
    if (newVerified) params.set('verified', 'true');
    if (newType) params.set('type', newType);
    if (newDigital) params.set('digital', 'true');

    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCategorySlug(val);
    updateUrl(val, regionSlug, verifiedOnly, organizationType, hasDigitalServicesOnly);
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setRegionSlug(val);
    updateUrl(categorySlug, val, verifiedOnly, organizationType, hasDigitalServicesOnly);
  };

  const handleVerifiedToggle = () => {
    const nextVerified = !verifiedOnly;
    setVerifiedOnly(nextVerified);
    updateUrl(categorySlug, regionSlug, nextVerified, organizationType, hasDigitalServicesOnly);
  };

  const handleQuickChip = (type: string, digital: boolean = false) => {
    const nextType = organizationType === type && !digital ? '' : type;
    const nextDigital = digital ? !hasDigitalServicesOnly : false;
    setOrganizationType(nextType);
    setHasDigitalServicesOnly(nextDigital);
    updateUrl(categorySlug, regionSlug, verifiedOnly, nextType, nextDigital);
  };

  const handleClearFilters = () => {
    setQuery('');
    setCategorySlug('');
    setRegionSlug('');
    setVerifiedOnly(false);
    setOrganizationType('');
    setHasDigitalServicesOnly(false);
    router.replace('/search', { scroll: false });
  };

  const hasActiveFilters = Boolean(
    query || categorySlug || regionSlug || verifiedOnly || organizationType || hasDigitalServicesOnly,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Search className="w-7 h-7 text-blue-600" />
            <span>Milliy raqamli xizmatlar va tashkilotlar qidiruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Tashkilotlar, ishonch telefonlari, davlat portallari hamda rasmiy mobil ilovalar
          </p>
        </div>

        <RealtimeSearchBox initialValue={query} size="normal" />

        {/* Quick Scope Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 mr-1">Tezkor filtr:</span>

          <button
            type="button"
            onClick={() => handleQuickChip('bank')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border transition-colors min-h-[44px] active:scale-95',
              organizationType === 'bank'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
            )}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Banklar</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChip('government')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border transition-colors min-h-[44px] active:scale-95',
              organizationType === 'government'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Davlat xizmatlari</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChip('', true)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border transition-colors min-h-[44px] active:scale-95',
              hasDigitalServicesOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
            )}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Rasmiy ilovalar</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickChip('utility')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border transition-colors min-h-[44px] active:scale-95',
              organizationType === 'utility'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100',
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Kommunal</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Kengaytirilgan filtr</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 min-h-[44px] px-2"
            >
              <X className="w-3.5 h-3.5" />
              <span>Filtrlarni tozalash</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kategoriya</label>
            <select
              value={categorySlug}
              onChange={handleCategoryChange}
              className="w-full rounded-xl border border-slate-200 p-2.5 min-h-[44px] text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.organization_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Region Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Viloyat / Hudud</label>
            <select
              value={regionSlug}
              onChange={handleRegionChange}
              className="w-full rounded-xl border border-slate-200 p-2.5 min-h-[44px] text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 bg-white"
            >
              <option value="">Barcha viloyatlar</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name} ({r.organization_count || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Verified Toggle */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleVerifiedToggle}
              className={clsx(
                'w-full flex items-center justify-center gap-2 p-2.5 min-h-[44px] rounded-xl text-xs font-bold border transition-colors active:scale-95',
                verifiedOnly
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
              )}
            >
              <CheckCircle2 className={clsx('w-4 h-4', verifiedOnly ? 'text-emerald-600' : 'text-slate-400')} />
              <span>Faqat tasdiqlanganlar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>
          Topilgan tashkilotlar: <strong className="text-slate-900 font-bold">{organizations.length} ta</strong>
        </span>
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse p-5" />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <EmptyState
          title="Tashkilotlar topilmadi"
          description={
            query
              ? `“${query}” bo‘yicha hech qanday natija topilmadi. Qidiruv so‘zini o‘zgartirib ko‘ring.`
              : 'Tanlangan filtrlar bo‘yicha faol tashkilotlar topilmadi.'
          }
          icon="search"
          action={
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
            >
              Filtrlarni tozalash
            </button>
          }
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
