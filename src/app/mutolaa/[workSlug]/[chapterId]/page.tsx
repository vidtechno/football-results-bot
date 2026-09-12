import { notFound, permanentRedirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';

interface LegacyMutolaaRedirectProps {
  params: Promise<{
    workSlug: string;
    chapterId: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = 'force-dynamic';

/**
 * Backward-compatible legacy redirect handler:
 * /mutolaa/{workSlug}/{chapterId} -> /asarlar/{workSlug}/{chapterSlug}
 *
 * - Safely resolves chapter slug
 * - Validates work-chapter relationship
 * - Preserves query parameters
 * - Returns 404 on invalid relationships
 * - Never bypasses access control (destination route enforces paywall/access)
 */
export default async function LegacyMutolaaRedirectPage({
  params,
  searchParams: searchParamsPromise,
}: LegacyMutolaaRedirectProps) {
  const { workSlug, chapterId } = await params;
  const searchParams = await searchParamsPromise;

  if (!workSlug || !chapterId) {
    notFound();
  }

  const admin = createAdminClient();

  // 1. Resolve work by slug or id
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workSlug);
  let workQuery = admin.from('works').select('id, slug, status');
  if (isWorkUuid) {
    workQuery = workQuery.eq('id', workSlug);
  } else {
    workQuery = workQuery.eq('slug', workSlug);
  }

  const { data: work } = await workQuery.maybeSingle();

  if (!work || work.status === 'archived') {
    notFound();
  }

  // 2. Resolve chapter belonging strictly to this work by id or slug
  const isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId);
  let chapQuery = admin
    .from('chapters')
    .select('id, slug, status')
    .eq('work_id', work.id);

  if (isChapterUuid) {
    chapQuery = chapQuery.eq('id', chapterId);
  } else {
    chapQuery = chapQuery.eq('slug', chapterId);
  }

  const { data: chapter } = await chapQuery.maybeSingle();

  if (!chapter || chapter.status === 'archived') {
    notFound();
  }

  // Build query string if any
  const queryParams = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, val]) => {
      if (typeof val === 'string') {
        queryParams.set(key, val);
      } else if (Array.isArray(val)) {
        val.forEach((v) => queryParams.append(key, v));
      }
    });
  }

  const queryString = queryParams.toString();
  const canonicalUrl = `/asarlar/${work.slug}/${chapter.slug}${queryString ? `?${queryString}` : ''}`;

  permanentRedirect(canonicalUrl);
}
