function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function htmlToPlainText(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|h[1-6]|li|blockquote|div|td|th|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Split only top-level blocks: nested lists and tables must stay intact. */
export function splitDocxBlocks(html: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = 0;
  for (const match of html.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)) {
    const tag = match[1].toLowerCase();
    if (['br', 'hr', 'img'].includes(tag) || match[0].endsWith('/>')) continue;
    if (match[0].startsWith('</')) depth = Math.max(0, depth - 1);
    else depth += 1;
    if (depth === 0) {
      const end = match.index! + match[0].length;
      blocks.push(html.slice(start, end));
      start = end;
    }
  }
  if (html.slice(start).trim()) blocks.push(html.slice(start));
  return blocks.filter((block) => block.trim());
}

export function normalizeDocxText(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
