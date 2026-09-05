import { MetadataRoute } from 'next';
import { getPublishedWorks, getActiveGenres, getApprovedAuthors } from '@/lib/db/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manbora.uz';

  const [works, genres, authors] = await Promise.all([
    getPublishedWorks({ limit: 500 }),
    getActiveGenres(),
    getApprovedAuthors(100),
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
    {
      url: `${baseUrl}/kitoblar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hikoyalar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
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
    {
      url: `${baseUrl}/muallif`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
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
