import { unstable_cache } from 'next/cache';
import { createCatalogueClient } from '@/lib/supabase/catalogue';

export interface SitemapWork {
  slug: string;
  title: string;
  cover_url: string | null;
  is_plus: boolean | null;
  is_translation: boolean | null;
  updated_at: string;
  created_at: string;
  published_at: string | null;
}

/** Supabase defaults to 1,000 rows, so page explicitly for a growing catalogue. */
export const getAllPublishedSitemapWorks = unstable_cache(
  async (): Promise<SitemapWork[]> => {
    const db = createCatalogueClient();
    const pageSize = 1000;
    const works: SitemapWork[] = [];

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await db
        .from('works')
        .select(
          'slug, title, cover_url, is_plus, is_translation, updated_at, created_at, published_at',
        )
        .eq('status', 'published')
        .or('is_archived.eq.false,is_archived.is.null')
        .order('updated_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Sitemap asarlarini yuklashda xatolik:', error.message);
        break;
      }

      const batch = (data || []) as SitemapWork[];
      works.push(...batch);
      if (batch.length < pageSize) break;
    }

    return works;
  },
  ['published-sitemap-works-v1'],
  { revalidate: 3600, tags: ['public-catalogue', 'seo-sitemap'] },
);
