import { createCatalogueClient } from '@/lib/supabase/catalogue';
import type { Work } from '@/lib/types/platform';

export interface PaginatedCatalogueResult {
  works: Work[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

/**
 * Fetch paginated works catalogue with deterministic sorting, count, and filters
 */
export async function getPaginatedCatalogue(options?: {
  page?: number;
  pageSize?: number;
  query?: string;
  genreSlug?: string;
  type?: 'book' | 'serialized_story';
  accessType?: 'free' | 'paid_full_work' | 'paid_by_chapter';
  completionStatus?: 'ongoing' | 'completed';
  sortBy?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
  collection?: string;
  isTranslation?: boolean;
  sourceLanguage?: string;
}): Promise<PaginatedCatalogueResult> {
  const page = Math.max(1, Number(options?.page) || 1);
  const pageSize = options?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const supabase = createCatalogueClient();

  let genreWorkIds: string[] | null = null;
  if (options?.genreSlug) {
    const { data: genre } = await supabase
      .from('genres')
      .select('id')
      .eq('slug', options.genreSlug)
      .maybeSingle();

    if (genre) {
      const { data: wgData } = await supabase
        .from('work_genres')
        .select('work_id')
        .eq('genre_id', genre.id);
      genreWorkIds = (wgData || []).map((wg) => wg.work_id);
    } else {
      genreWorkIds = [];
    }
  }

  // The general catalogue remains compatible before migration 039; only its
  // new ranking filters require the counters.
  let q = supabase
    .from('works')
    .select(
      `
      id,
      author_id,
      title,
      slug,
      description,
      cover_url,
      type,
      status,
      access_type,
      full_work_price,
      age_rating,
      completion_status,
      language,
      is_translation,
      is_plus,
      original_title,
      original_author_name,
      credited_author_name,
      source_language,
      translator_name,
      translation_rights_basis,
      is_archived,
      is_featured,
      total_words,
      average_rating,
      rating_count,
      view_count,
      published_at,
      created_at,
      updated_at,
      author:author_profiles (
        user_id,
        pen_name,
        status,
        profile:profiles (
          id,
          display_name,
          username,
          avatar_url
        )
      ),
      work_genres (
        genre:genres (id, name, slug)
      )
    `,
      { count: 'exact' },
    )
    .eq('status', 'published');

  if (genreWorkIds !== null) {
    if (genreWorkIds.length === 0) {
      return { works: [], totalCount: 0, totalPages: 0, currentPage: page, pageSize };
    }
    q = q.in('id', genreWorkIds);
  }

  if (options?.query) {
    const rawQ = options.query.trim();
    // Normalize Uzbek apostrophes to wildcard to handle both ' and ’ and `
    const normalized = rawQ.replace(/['`’‘ʻʼ]/g, '%');

    // Also find author user_ids matching the search term
    const { data: matchedAuthors } = await supabase
      .from('author_profiles')
      .select('user_id')
      .ilike('pen_name', `%${normalized}%`);

    const authorIds = (matchedAuthors || []).map((a) => a.user_id);

    if (authorIds.length > 0) {
      q = q.or(
        `title.ilike.%${normalized}%,description.ilike.%${normalized}%,original_author_name.ilike.%${normalized}%,credited_author_name.ilike.%${normalized}%,translator_name.ilike.%${normalized}%,author_id.in.(${authorIds.join(',')})`,
      );
    } else {
      q = q.or(
        `title.ilike.%${normalized}%,description.ilike.%${normalized}%,original_author_name.ilike.%${normalized}%,credited_author_name.ilike.%${normalized}%,translator_name.ilike.%${normalized}%`,
      );
    }
  }

  if (options?.isTranslation !== undefined) {
    q = q.eq('is_translation', options.isTranslation);
  }

  if (options?.sourceLanguage) {
    q = q.eq('source_language', options.sourceLanguage);
  }

  if (options?.type) {
    q = q.eq('type', options.type);
  }

  if (options?.accessType) {
    q = q.eq('access_type', options.accessType);
  }

  if (options?.completionStatus) {
    q = q.eq('completion_status', options.completionStatus);
  }

  // Curated collections logic
  if (options?.collection) {
    switch (options.collection) {
      case 'ommabop':
        q = q
          .order('view_count', { ascending: false })
          .order('average_rating', { ascending: false });
        break;
      case 'eng_kop_oqilgan':
        q = q
          .gt('unique_readers_count', 0)
          .order('unique_readers_count', { ascending: false })
          .order('view_count', { ascending: false });
        break;
      case 'bestseller':
        q = q
          .eq('access_type', 'paid_full_work')
          .gt('sales_count', 0)
          .order('sales_count', { ascending: false });
        break;
      case 'kitobxonlar_sevgan':
        q = q
          .gt('rating_count', 0)
          .order('average_rating', { ascending: false })
          .order('rating_count', { ascending: false });
        break;
      case 'yangi_boshlangan':
        q = q
          .eq('type', 'serialized_story')
          .eq('completion_status', 'ongoing')
          .order('published_at', { ascending: false });
        break;
      case 'yaqinda_yangilangan':
        q = q.order('updated_at', { ascending: false });
        break;
      case 'tugallangan':
        q = q.eq('completion_status', 'completed');
        break;
      case '15_daqiqa':
        q = q.eq('type', 'serialized_story').gt('total_words', 0).lte('total_words', 3500);
        break;
      case 'bepul':
        q = q.eq('access_type', 'free');
        break;
      case 'muharrir_tanlovi':
        q = q.eq('is_featured', true);
        break;
      case 'yangi_mualliflar':
        q = q.order('created_at', { ascending: false });
        break;
      case 'eng_kop_muhokama':
        q = q.order('rating_count', { ascending: false }).order('view_count', { ascending: false });
        break;
      case 'top_haftalik':
        q = q
          .order('average_rating', { ascending: false })
          .order('view_count', { ascending: false });
        break;
    }
  } else if (options?.sortBy === 'price_asc') {
    q = q.order('full_work_price', { ascending: true }).order('id', { ascending: true });
  } else if (options?.sortBy === 'price_desc') {
    q = q.order('full_work_price', { ascending: false }).order('id', { ascending: true });
  } else if (options?.sortBy === 'rating') {
    q = q.order('average_rating', { ascending: false }).order('rating_count', { ascending: false });
  } else if (options?.sortBy === 'popular') {
    q = q.order('view_count', { ascending: false }).order('average_rating', { ascending: false });
  } else {
    q = q.order('published_at', { ascending: false }).order('id', { ascending: true });
  }

  q = q.range(offset, offset + pageSize - 1);

  const { data, count, error } = await q;

  if (error) {
    console.error('Error fetching paginated catalogue:', error);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    works: (data as unknown as Work[]) || [],
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
  };
}
