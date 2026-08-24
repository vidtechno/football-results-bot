import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/diyoration/', '/api/'],
      },
    ],
    sitemap: 'https://manbora.uz/sitemap.xml',
  };
}
