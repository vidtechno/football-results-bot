import { unstable_cache } from 'next/cache';
import { createCatalogueClient } from '@/lib/supabase/catalogue';
import type { Genre } from '@/lib/types/platform';

/**
 * Fetch active genres sorted by order.
 */
export async function getActiveGenres(): Promise<Genre[]> {
  const supabase = createCatalogueClient();
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching genres:', error);
    return [];
  }

  return (data as Genre[]) || [];
}

export const getActiveGenreBySlug = unstable_cache(
  async (slug: string): Promise<Genre | null> => {
    const { data } = await createCatalogueClient()
      .from('genres')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    return (data as Genre) || null;
  },
  ['public-genre-by-slug-v1'],
  { revalidate: 300, tags: ['public-catalogue', 'public-genres'] },
);

/**
 * Fetch genres with published work counts
 */
export async function getGenresWithCounts(): Promise<Array<Genre & { works_count: number }>> {
  const supabase = createCatalogueClient();
  const [genresRes, wgRes] = await Promise.all([
    supabase
      .from('genres')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('work_genres')
      .select('genre_id, work:works!inner(status, is_archived)')
      .eq('work.status', 'published')
      .neq('work.is_archived', true),
  ]);

  const genres = (genresRes.data as Genre[]) || [];
  const countsMap = new Map<string, number>();

  for (const wg of wgRes.data || []) {
    countsMap.set(wg.genre_id, (countsMap.get(wg.genre_id) || 0) + 1);
  }

  return genres.map((g) => ({
    ...g,
    works_count: countsMap.get(g.id) || 0,
  }));
}
