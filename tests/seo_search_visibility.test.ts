import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { notifyIndexNow } from '../src/lib/seo/indexNow';
import { serializeJsonLd } from '../src/lib/seo/jsonLd';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const previousIndexNowKey = process.env.INDEXNOW_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (previousIndexNowKey === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = previousIndexNowKey;
});

describe('search visibility and crawler safety', () => {
  it('serializes untrusted JSON-LD without allowing a script breakout', () => {
    const output = serializeJsonLd({ title: '</script><script>alert(1)</script>' });
    expect(output).not.toContain('</script>');
    expect(output).toContain('\\u003c/script\\u003e');
  });

  it('publishes canonical work, chapter, author, genre and breadcrumb schemas', () => {
    const work = read('src/app/asarlar/[slug]/page.tsx');
    const chapter = read('src/app/asarlar/[slug]/[chapterSlug]/page.tsx');
    const author = read('src/app/mualliflar/[username]/page.tsx');
    const genre = read('src/app/janrlar/[slug]/page.tsx');

    expect(work).toContain("'@type': workSchemaType");
    expect(work).toContain("'@type': 'BreadcrumbList'");
    expect(work).toContain('aggregateRating');
    expect(work).toContain('offers: paidOffer');
    expect(chapter).toContain("'@type': 'Chapter'");
    expect(chapter).toContain('index: publiclyIndexable');
    expect(chapter).not.toContain('Boolean(work.is_plus)');
    expect(author).toContain("'@type': 'Person'");
    expect(genre).toContain("'@type': 'CollectionPage'");
    expect(genre).toContain("'@type': 'ItemList'");
  });

  it('provides scalable page and image sitemaps with truthful modification dates', () => {
    const sitemap = read('src/app/sitemap.ts');
    const sitemapData = read('src/lib/seo/sitemapData.ts');
    const imageSitemap = read('src/app/sitemap-images.xml/route.ts');
    const robots = read('src/app/robots.ts');

    expect(sitemapData).toContain('pageSize = 1000');
    expect(sitemapData).toContain('.range(from, from + pageSize - 1)');
    expect(sitemap).not.toContain('`${baseUrl}/qidiruv`');
    expect(sitemap).not.toContain('lastModified: new Date()');
    expect(imageSitemap).toContain('xmlns:image=');
    expect(imageSitemap).toContain('<image:loc>');
    expect(robots).toContain('https://manbora.uz/sitemap.xml');
    expect(robots).toContain('https://manbora.uz/sitemap-images.xml');
  });

  it('adds verification metadata, default social imagery and descriptive cover alt text', () => {
    const layout = read('src/app/layout.tsx');
    const card = read('src/components/work/WorkCard.tsx');

    expect(layout).toContain('GOOGLE_SITE_VERIFICATION');
    expect(layout).toContain('YANDEX_SITE_VERIFICATION');
    expect(layout).toContain("images: ['/opengraph-image']");
    expect(card).toContain('asari muqovasi');
  });

  it('submits only same-host canonical URLs to IndexNow and exposes a key location', async () => {
    process.env.INDEXNOW_KEY = 'manbora-indexnow-test-key';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await notifyIndexNow(['/asarlar/test-kitob', 'https://evil.example/test']);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(options?.body));
    expect(body.keyLocation).toBe('https://manbora.uz/indexnow-key.txt');
    expect(body.urlList).toEqual(['https://manbora.uz/asarlar/test-kitob']);
    expect(read('src/app/indexnow-key.txt/route.ts')).toContain('getIndexNowKeyText');
  });

  it('connects IndexNow to publication and approved revision flows', () => {
    const moderation = read('src/app/api/admin/moderation-action/route.ts');
    const revisions = read('src/app/api/admin/revisions-action/route.ts');

    expect(moderation).toContain('await notifyIndexNow([`/asarlar/${work.slug}`])');
    expect(revisions).toContain('await notifyIndexNow([`/asarlar/${workSlug}`])');
    expect(revisions).toContain('chapterSlug ? `/asarlar/${workSlug}/${chapterSlug}` : null');
  });
});
