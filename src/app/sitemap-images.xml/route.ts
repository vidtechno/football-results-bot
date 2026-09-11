import { getAllPublishedSitemapWorks } from '@/lib/seo/sitemapData';

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const works = await getAllPublishedSitemapWorks();
  const urls = works
    .filter((work) => Boolean(work.cover_url))
    .map(
      (work) => `
  <url>
    <loc>${escapeXml(`https://manbora.uz/asarlar/${work.slug}`)}</loc>
    <image:image>
      <image:loc>${escapeXml(work.cover_url || '')}</image:loc>
      <image:title>${escapeXml(`${work.title} kitob muqovasi`)}</image:title>
    </image:image>
  </url>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
