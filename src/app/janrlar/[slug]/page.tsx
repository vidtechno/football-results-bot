import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Tag, BookOpen, ChevronLeft } from 'lucide-react';
import { getActiveGenreBySlug, getPaginatedCatalogue } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { CataloguePagination } from '@/components/catalogue/CataloguePagination';
import { seoDescription, serializeJsonLd } from '@/lib/seo/jsonLd';

export const revalidate = 30;

interface GenreDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
    access?: 'free' | 'paid_full_work' | 'paid_by_chapter';
    type?: 'book' | 'serialized_story';
  }>;
}

export async function generateMetadata({ params: paramsPromise }: GenreDetailPageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const genre = await getActiveGenreBySlug(params.slug);

  if (!genre) {
    return { title: 'Janr topilmadi' };
  }

  const canonicalPath = `/janrlar/${params.slug}`;
  const description = seoDescription(
    genre.description,
    `${genre.name} janridagi sara o‘zbek kitoblari, hikoyalar va qissalarni Manbora platformasida o‘qing.`,
  );
  return {
    title: `${genre.name} janridagi asarlar`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: 'website',
      title: `${genre.name} janridagi kitoblar va hikoyalar`,
      description,
      url: canonicalPath,
      siteName: 'Manbora',
      locale: 'uz_UZ',
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${genre.name} janridagi kitoblar va hikoyalar`,
      description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function GenreDetailPage({ params: paramsPromise, searchParams: searchParamsPromise }: GenreDetailPageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const genre = await getActiveGenreBySlug(params.slug);

  if (!genre) {
    notFound();
  }

  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const sortBy = searchParams.sort || 'newest';
  const accessFilter = searchParams.access;
  const typeFilter = searchParams.type;

  const catalogue = await getPaginatedCatalogue({
    page: currentPage,
    pageSize: 20,
    genreSlug: genre.slug,
    sortBy,
    accessType: accessFilter,
    type: typeFilter,
  });

  const { works, totalCount, totalPages } = catalogue;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <div id="genre-works-top" />

      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
          <Link href="/janrlar" className="hover:text-stone-900 flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Janrlar katalogi</span>
          </Link>
          <span>/</span>
          <span className="text-stone-900">{genre.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C1917] tracking-tight flex items-center gap-2.5">
              <Tag className="w-6 h-6 text-amber-600" />
              <span>{genre.name}</span>
            </h1>
            {genre.description && (
              <p className="text-xs sm:text-sm text-[#78716C] font-medium max-w-2xl">
                {genre.description}
              </p>
            )}
          </div>
          <span className="self-start sm:self-center px-3 py-1.5 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0">
            Jami: {totalCount} ta asar
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-[#EAE5DD] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/janrlar/${genre.slug}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              !accessFilter && !typeFilter
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Barchasi
          </Link>
          <Link
            href={`/janrlar/${genre.slug}?type=book${accessFilter ? `&access=${accessFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              typeFilter === 'book'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Kitoblar
          </Link>
          <Link
            href={`/janrlar/${genre.slug}?type=serialized_story${accessFilter ? `&access=${accessFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              typeFilter === 'serialized_story'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Hikoyalar
          </Link>
          <Link
            href={`/janrlar/${genre.slug}?access=free${typeFilter ? `&type=${typeFilter}` : ''}`}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              accessFilter === 'free'
                ? 'bg-[#B45309] text-white shadow-xs'
                : 'bg-[#F5F2EC] hover:bg-[#EAE5DD] text-[#57534E]'
            }`}
          >
            Bepul
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[11px] text-stone-400 font-bold mr-1">Tartiblash:</span>
          {[
            { label: 'Yangi', value: 'newest' },
            { label: 'Ommabop', value: 'popular' },
            { label: 'Reyting', value: 'rating' },
          ].map((s) => (
            <Link
              key={s.value}
              href={`/janrlar/${genre.slug}?sort=${s.value}${typeFilter ? `&type=${typeFilter}` : ''}${accessFilter ? `&access=${accessFilter}` : ''}`}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                sortBy === s.value
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Works Listing */}
      {works.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-sans font-bold text-stone-800 text-base">
            Bu janrda asarlar topilmadi
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Ushbu janr bo‘yicha hozircha chop etilgan asarlar mavjud emas yoki filtrlarga mos
            kelmadi.
          </p>
          <Link
            href={`/janrlar/${genre.slug}`}
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Filtrlarni tozalash
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={20}
            scrollTargetId="genre-works-top"
          />
        </>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'CollectionPage',
                '@id': `https://manbora.uz/janrlar/${genre.slug}#collection`,
                name: `${genre.name} janridagi asarlar`,
                description: genre.description || undefined,
                url: `https://manbora.uz/janrlar/${genre.slug}`,
                inLanguage: 'uz',
                mainEntity: {
                  '@type': 'ItemList',
                  numberOfItems: totalCount,
                  itemListElement: works.map((work, index) => ({
                    '@type': 'ListItem',
                    position: (currentPage - 1) * 20 + index + 1,
                    name: work.title,
                    url: `https://manbora.uz/asarlar/${work.slug}`,
                  })),
                },
              },
              {
                '@type': 'BreadcrumbList',
                itemListElement: [
                  {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Bosh sahifa',
                    item: 'https://manbora.uz',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Janrlar',
                    item: 'https://manbora.uz/janrlar',
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: genre.name,
                    item: `https://manbora.uz/janrlar/${genre.slug}`,
                  },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}
