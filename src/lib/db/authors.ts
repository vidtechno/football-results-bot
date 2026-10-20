import { unstable_cache } from 'next/cache';
import { createCatalogueClient } from '@/lib/supabase/catalogue';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import type { Work, AuthorProfile } from '@/lib/types/platform';
import { requestCache } from './shared';

/**
 * Fetch public author profile and their published works.
 */
export async function getAuthorByUsername(username: string): Promise<{
  author: AuthorProfile | null;
  works: Work[];
}> {
  const supabase = await createServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, public_id, display_name, username, avatar_url, bio, social_links, is_admin, onboarding_completed, created_at, updated_at')
    .eq('username', username)
    .single();

  if (!profile) {
    return { author: null, works: [] };
  }

  const { data: author } = await supabase
    .from('author_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  if (!author || author.status !== 'approved') {
    return { author: null, works: [] };
  }

  const { data: works } = await supabase
    .from('works')
    .select('*')
    .eq('author_id', author.user_id)
    .eq('status', 'published')
    .eq('is_translation', false)
    .is('credited_author_name', null)
    .order('published_at', { ascending: false });

  return {
    author: {
      ...author,
      profile,
    },
    works: (works as Work[]) || [],
  };
}

/**
 * Fetch list of approved authors for public directory
 */
export async function getApprovedAuthors(limit = 40): Promise<AuthorProfile[]> {
  const supabase = createCatalogueClient();

  const { data } = await supabase
    .from('author_profiles')
    .select(
      `
      *,
      profile:profiles(id, display_name, username, avatar_url)
    `,
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data as AuthorProfile[]) || [];
}

/**
 * Fetch public author profile and works by ID, user_id or username
 */
const getCachedPublicAuthorIdentity = unstable_cache(
  async (identifier: string) => {
    const supabase = createAdminClient();

    // Try finding by user_id first, then id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier,
    );
    const { data: author, error: authorError } = isUuid
      ? await supabase
          .from('author_profiles')
          .select(
            `
      *,
      profile:profiles(id, display_name, username, avatar_url, bio, social_links)
    `,
          )
          .or(`user_id.eq.${identifier},id.eq.${identifier}`)
          .eq('status', 'approved')
          .maybeSingle()
      : await supabase
          .from('author_profiles')
          .select(
            `
          *,
          profile:profiles!inner(id, display_name, username, avatar_url, bio, social_links)
        `,
          )
          .eq('profile.username', identifier)
          .eq('status', 'approved')
          .maybeSingle();
    if (authorError) throw authorError;
    return author;
  },
  ['public-author-identity-v1'],
  { revalidate: 60, tags: ['public-catalogue', 'public-authors'] },
);

export const getPublicAuthorIdentity = requestCache(getCachedPublicAuthorIdentity);

const getCachedPublicAuthor = unstable_cache(
  async function getPublicAuthor(identifier: string) {
    const supabase = createAdminClient();
    const author = await getPublicAuthorIdentity(identifier);
    if (!author) return null;

    const [worksRes, followersRes, followingRes, readsRes] = await Promise.all([
      supabase
        .from('works')
        .select(
          `
        *,
        work_genres(genre:genres(*))
      `,
        )
        .eq('author_id', author.user_id)
        .eq('status', 'published')
        .eq('is_archived', false)
        .eq('is_translation', false)
        .is('credited_author_name', null)
        .order('published_at', { ascending: false }),
      supabase
        .from('author_follows')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', author.user_id),
      supabase
        .from('author_follows')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', author.user_id),
      supabase
        .from('reading_progress')
        .select(
          'id,work:works!inner(author_id,status,is_archived,is_translation,credited_author_name)',
          { count: 'exact', head: true },
        )
        .eq('work.author_id', author.user_id)
        .eq('work.status', 'published')
        .eq('work.is_archived', false)
        .eq('work.is_translation', false)
        .is('work.credited_author_name', null)
        .neq('user_id', author.user_id),
    ]);

    for (const result of [worksRes, followersRes, followingRes, readsRes]) {
      if (result.error) throw result.error;
    }
    const rawWorks = (worksRes.data as any[]) || [];
    // Ensure each work carries the author object so WorkCard displays the real author pen name!
    const works = rawWorks.map((w) => ({
      ...w,
      author: {
        pen_name: author.pen_name,
        biography: author.biography,
        user_id: author.user_id,
      },
    })) as Work[];
    const followerCount = followersRes.count || 0;
    const followingCount = followingRes.count || 0;

    // Count actual public reading records in parallel, excluding author self-reads.
    const totalReads = readsRes.count || 0;

    return {
      author,
      works,
      totalWorks: works.length,
      totalReads,
      followerCount,
      followingCount,
    };
  },
  ['public-author-profile-v2'],
  { revalidate: 60, tags: ['public-catalogue', 'public-authors'] },
);

export const getPublicAuthor = requestCache(getCachedPublicAuthor);

export const getPublicAuthorPosts = unstable_cache(
  async (authorUserId: string) => {
    const { data, error } = await createAdminClient()
      .from('author_posts')
      .select('id, content, pinned, created_at')
      .eq('author_id', authorUserId)
      .eq('is_published', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  ['public-author-posts-v1'],
  { revalidate: 60, tags: ['public-author-posts'] },
);
