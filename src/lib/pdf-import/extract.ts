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
  // Joining our own page renderings keeps page boundaries and source offsets deterministic.
  const rawText = pages.length ? pages.join('\n\n') : result.text || '';
  ensureSelectableText(rawText, result.numpages || pages.length);
  return { rawText, pages, pageCount: result.numpages || pages.length };
}

export function findRepeatedPageFurniture(pages: string[]) {
  return analyzePageFurniture(pages).items;
}

export function findPdfMetadataCandidates(pages: string[]) {
  const counts = new Map<string, number>();
  const edgeCounts = new Map<string, number>();
  pages.forEach((page) => new Set(page.split('\n').map((line) => line.trim()).filter((line) => line.length >= 2 && line.length <= 140)).forEach((line) => counts.set(line, (counts.get(line) || 0) + 1)));
  pages.forEach((page) => {
    const lines = page.split('\n');
    const edges = new Set([...lines.slice(0, 2), ...lines.slice(-2)].map((line) => line.trim()).filter(Boolean));
    edges.forEach((line) => edgeCounts.set(line, (edgeCounts.get(line) || 0) + 1));
  });
  return [...counts.entries()]
    // Domain marks can occur inside extracted body text. Other candidates must
    // repeat at page edges so ordinary repeated prose is never offered to AI.
    .filter(([text, count]) => count >= 2 && (/\b(?:www|https?)\b|\b[a-z0-9-]{2,}\s*(?:\.|\s)\s*(?:uz|com|org|net)\b/iu.test(text) || (edgeCounts.get(text) || 0) >= 2))
    .slice(0, 60)
    .map(([text, occurrences], id) => ({ id, text, occurrences, edgeOccurrences: edgeCounts.get(text) || 0 }));
}

export function analyzePageFurniture(pages: string[], aiApprovedTexts: string[] = []) {
  const counts = new Map<string, number>();
  const pageLines = pages.map((page) => page.split('\n'));
  for (const lines of pageLines) {
    const edgeLines = [...lines.slice(0, 2), ...lines.slice(-2)];
    const unique = new Set(edgeLines.map((line) => line.trim()).filter((line) => line.length >= 2 && line.length <= 100));
    unique.forEach((line) => counts.set(line, (counts.get(line) || 0) + 1));
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  const repeated = [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([text, occurrences]) => ({ text, occurrences, action: 'removed_from_content' }));
  const repeatedSet = new Set(repeated.map((item) => item.text));
  const approvedSet = new Set(aiApprovedTexts);
  const domainCandidates = findPdfMetadataCandidates(pages).filter((item) =>
    /\b(?:www|https?)\b|\b[a-z0-9-]{2,}\s*(?:\.|\s)\s*(?:uz|com|org|net)\b/iu.test(item.text),
  );
  domainCandidates.forEach((item) => repeatedSet.add(item.text));
  approvedSet.forEach((text) => repeatedSet.add(text));
  const ranges: Array<{ start: number; end: number }> = [];
  let pageOffset = 0;
  let pageNumberCount = 0;
  pageLines.forEach((lines, pageIndex) => {
    let lineOffset = 0;
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      const isEdge = lineIndex < 2 || lineIndex >= lines.length - 2;
      const isPageNumber = isEdge && /^(?:sahifa\s*)?\d{1,4}$/iu.test(trimmed);
      // Exact domains and AI-approved metadata may occur mid-page. Page numbers
      // and deterministic running furniture remain edge-only.
      if ((repeatedSet.has(trimmed) && (isEdge || approvedSet.has(trimmed) || domainCandidates.some((item) => item.text === trimmed))) || isPageNumber) {
        const leading = line.indexOf(trimmed);
        ranges.push({
          start: pageOffset + lineOffset + Math.max(0, leading),
          end: pageOffset + lineOffset + Math.max(0, leading) + trimmed.length,
        });
        if (isPageNumber && !repeatedSet.has(trimmed)) pageNumberCount += 1;
      }
      lineOffset += line.length + (lineIndex < lines.length - 1 ? 1 : 0);
    });
    pageOffset += pages[pageIndex].length + (pageIndex < pages.length - 1 ? 2 : 0);
  });
  return {
    items: [
      ...repeated,
      ...domainCandidates.filter((item) => !repeated.some((known) => known.text === item.text)).map(({ text, occurrences }) => ({ text, occurrences, action: 'removed_from_content' })),
      ...aiApprovedTexts.filter((text) => !repeated.some((item) => item.text === text) && !domainCandidates.some((item) => item.text === text)).map((text) => ({ text, occurrences: 2, action: 'ai_approved_metadata' })),
      ...(pageNumberCount
        ? [{ text: 'Sahifa raqamlari', occurrences: pageNumberCount, action: 'removed_from_content' }]
        : []),
    ],
    ranges,
  };
}
