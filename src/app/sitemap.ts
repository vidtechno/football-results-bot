import { MetadataRoute } from 'next';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manbora.uz';

  const [works, genres] = await Promise.all([
    getPublishedWorks({ limit: 500 }),
    getActiveGenres(),
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
      url: `${baseUrl}/muallif`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const workRoutes: MetadataRoute.Sitemap = works.map((w) => ({
    url: `${baseUrl}/asarlar/${w.slug}`,
    lastModified: new Date(w.updated_at || w.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const genreRoutes: MetadataRoute.Sitemap = genres.map((g) => ({
    url: `${baseUrl}/asarlar?genre=${g.slug}`,
    lastModified: new Date(g.created_at),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...workRoutes, ...genreRoutes];
}
