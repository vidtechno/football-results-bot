import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/mualliflar',
          '/mualliflar/',
          '/asarlar',
          '/asarlar/',
          '/tarjima-asarlar',
          '/tarjima-asarlar/',
          '/janrlar',
          '/janrlar/',
          '/muallif-boling',
        ],
        disallow: [
          '/diyoration',
          '/diyoration/',
          '/api',
          '/api/',
          '/kabinet',
          '/kabinet/',
          '/kutubxona',
          '/kutubxona/',
          '/bildirishnomalar',
          '/bildirishnomalar/',
          '/muallif$',
          '/muallif/',
          '/kirish',
          '/royxatdan-otish',
          '/tiklash',
        ],
      },
    ],
    sitemap: 'https://manbora.uz/sitemap.xml',
  };
}
