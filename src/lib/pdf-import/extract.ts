// Import the parser implementation directly. The package root runs a debug fixture
// when loaded by some ESM test runners.
import pdf from 'pdf-parse/lib/pdf-parse.js';

export function ensureSelectableText(rawText: string, pageCount: number) {
  if (rawText.replace(/\s/g, '').length < Math.max(100, Math.max(1, pageCount) * 20)) {
    throw new Error('SCANNED_PDF');
  }
}

export async function extractPdf(buffer: Buffer) {
  const pages: string[] = [];
  const result = await pdf(buffer, {
    pagerender: async (page: any) => {
      const content = await page.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: false,
      });
      let lastY: number | null = null;
      let text = '';
      for (const item of content.items as any[]) {
        const y = Number(item.transform?.[5] || 0);
        text += lastY === null || Math.abs(y - lastY) < 2 ? (text ? ' ' : '') : '\n';
        text += String(item.str || '');
        lastY = y;
      }
      pages.push(text);
      return text;
    },
  } as any);
  const rawText = result.text || pages.join('\n\n');
  ensureSelectableText(rawText, result.numpages || pages.length);
  return { rawText, pages, pageCount: result.numpages || pages.length };
}

export function findRepeatedPageFurniture(pages: string[]) {
  const counts = new Map<string, number>();
  for (const page of pages) {
    const unique = new Set(
      page
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length >= 2 && line.length <= 100),
    );
    unique.forEach((line) => counts.set(line, (counts.get(line) || 0) + 1));
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([text, occurrences]) => ({ text, occurrences, action: 'retained' }));
}
