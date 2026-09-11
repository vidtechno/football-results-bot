import { MetadataRoute } from 'next';
import { getActiveGenres, getApprovedAuthors } from '@/lib/db/queries';
import { createAdminClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manbora.uz';

  const db = createAdminClient();

  // Efficiently fetch all published works without heavy relation joins
  const fetchWorksPromise = db
    .from('works')
    .select('slug, updated_at, created_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .then(({ data }) => data || []);

  const [works, genres, authors] = await Promise.all([
    fetchWorksPromise,
    getActiveGenres(),
    getApprovedAuthors(500),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/asarlar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    { url: `${baseUrl}/plus`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    {
      url: `${baseUrl}/tarjima-asarlar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/muallif-boling`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/janrlar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mualliflar`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/qidiruv`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ];

  const workRoutes: MetadataRoute.Sitemap = works.map((w) => ({
    url: `${baseUrl}/asarlar/${w.slug}`,
    lastModified: new Date(w.updated_at || w.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const genreRoutes: MetadataRoute.Sitemap = genres.map((g) => ({
    url: `${baseUrl}/janrlar/${g.slug}`,
    lastModified: new Date(g.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const authorRoutes: MetadataRoute.Sitemap = authors
    .filter((a): a is typeof a & { profile: NonNullable<typeof a.profile> } => Boolean(a.profile?.username))
    .map((a) => ({
      url: `${baseUrl}/mualliflar/${a.profile.username}`,
      lastModified: new Date(a.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  return [...staticRoutes, ...workRoutes, ...genreRoutes, ...authorRoutes];
}
