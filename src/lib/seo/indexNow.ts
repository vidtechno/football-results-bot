const SITE_URL = 'https://manbora.uz';

function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export function getIndexNowKeyText(): string | null {
  return getIndexNowKey();
}

/**
 * Sends public canonical URLs to Yandex IndexNow after publication. IndexNow is
 * a discovery hint, not a ranking or indexing guarantee. Failures are swallowed
 * so publishing content never depends on a search engine being available.
 */
export async function notifyIndexNow(paths: Array<string | null | undefined>): Promise<void> {
  const key = getIndexNowKey();
  if (!key) return;

  const urlList = Array.from(
    new Set(
      paths
        .filter((path): path is string => Boolean(path))
        .map((path) => new URL(path, SITE_URL).toString())
        .filter((url) => url.startsWith(`${SITE_URL}/`) || url === SITE_URL),
    ),
  ).slice(0, 10_000);

  if (urlList.length === 0) return;

  try {
    await fetch('https://yandex.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'manbora.uz',
        key,
        keyLocation: `${SITE_URL}/indexnow-key.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
  } catch (error) {
    console.warn('IndexNow xabari yuborilmadi:', error);
  }
}
