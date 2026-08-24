import { MetadataRoute } from 'next';
import { getCategories, getRegions, searchOrganizations } from '@/lib/db/directory';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://manbora.uz';

  const [categories, regions, organizations] = await Promise.all([
    getCategories(),
    getRegions(),
    searchOrganizations({ limit: 1000 }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/regions`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/categories/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const regionRoutes: MetadataRoute.Sitemap = regions.map((r) => ({
    url: `${baseUrl}/regions/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const organizationRoutes: MetadataRoute.Sitemap = organizations.map((o) => ({
    url: `${baseUrl}/organizations/${o.slug}`,
    lastModified: new Date(o.updated_at || o.created_at),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticRoutes, ...categoryRoutes, ...regionRoutes, ...organizationRoutes];
}
