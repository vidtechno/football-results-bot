/**
 * Serializes JSON-LD without allowing user-controlled text to terminate the
 * script element. Keep structured data server-rendered and safe for crawlers.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function seoDescription(value: string | null | undefined, fallback: string): string {
  const normalized = (value || fallback)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length <= 160 ? normalized : `${normalized.slice(0, 157).trimEnd()}…`;
}
