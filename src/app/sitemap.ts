import { MetadataRoute } from 'next';
import { getActiveGenres, getApprovedAuthors } from '@/lib/db/queries';
import { getAllPublishedSitemapWorks } from '@/lib/seo/sitemapData';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manbora.uz';

  const [works, genres, authors] = await Promise.all([
    getAllPublishedSitemapWorks(),
    getActiveGenres(),
    getApprovedAuthors(500),
  ]);
  const latestContentDate = works[0]
    ? new Date(works[0].updated_at || works[0].published_at || works[0].created_at)
    : undefined;
  const latestPlusWork = works.find((work) => work.is_plus);
  const latestTranslationWork = works.find((work) => work.is_translation);
  const latestPlusDate = latestPlusWork
    ? new Date(latestPlusWork.updated_at || latestPlusWork.created_at)
    : latestContentDate;
  const latestTranslationDate = latestTranslationWork
    ? new Date(latestTranslationWork.updated_at || latestTranslationWork.created_at)
    : latestContentDate;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/asarlar`,
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/plus`,
      lastModified: latestPlusDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tarjima-asarlar`,
      lastModified: latestTranslationDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/muallif-boling`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/janrlar`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mualliflar`,
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
    url: `${baseUrl}/janrlar/${g.slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const authorRoutes: MetadataRoute.Sitemap = authors
    .filter((a): a is typeof a & { profile: NonNullable<typeof a.profile> } =>
      Boolean(a.profile?.username),
    )
    .map((a) => ({
      url: `${baseUrl}/mualliflar/${a.profile.username}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  return [...staticRoutes, ...workRoutes, ...genreRoutes, ...authorRoutes];
}
