import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/diyoration/',
          '/api/',
          '/kabinet',
          '/kutubxona',
          '/bildirishnomalar',
          '/muallif/asar/',
          '/kirish',
          '/royxatdan-otish',
          '/tiklash',
        ],
      },
    ],
    sitemap: 'https://manbora.uz/sitemap.xml',
  };
}
