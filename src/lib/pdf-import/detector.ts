import { createHash, randomUUID } from 'node:crypto';
import type { ImportChapter, ImportStats } from './types';

const ORDINALS =
  '(?:BIRINCHI|IKKINCHI|UCHINCHI|TO.RTINCHI|BESHINCHI|OLTINCHI|YETTINCHI|SAKKIZINCHI|TO.QQIZINCHI|O.NINCHI)';
const ROMAN = '(?:[IVXLCDM]+)';
const ARABIC = '(?:\\d{1,4})';
const HEADING = new RegExp(
  `^(?:(?:${ARABIC}[-.]?\\s*BOB)|(?:${ROMAN}\\s+BOB)|(?:${ORDINALS}\\s+(?:BOB|QISM))|(?:${ROMAN}\\s+QISM)|(?:CHAPTER\\s+(?:${ARABIC}|${ROMAN})))(?:\\s*[.:—-]\\s*.+)?$|^(?:${ARABIC}\\.\\s+\\S.{0,100})$`,
  'iu',
);

export function normalizeForIntegrity(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function fingerprint(value: string) {
  return createHash('sha256').update(normalizeForIntegrity(value), 'utf8').digest('hex');
}

function confidenceFor(line: string, beforeBlank: boolean, afterBlank: boolean) {
  let score = 0.54;
  if (/^(?:\d+[-.]?\s*BOB|[IVXLCDM]+\s+BOB|CHAPTER\s+)/iu.test(line)) score += 0.25;
  if (beforeBlank) score += 0.08;
  if (afterBlank) score += 0.06;
  if (line.length <= 80) score += 0.04;
  if (line === line.toUpperCase() && /\p{L}/u.test(line)) score += 0.03;
  return Math.min(0.99, score);
}

function withoutRanges(
  rawText: string,
  start: number,
  end: number,
  ignoredRanges: Array<{ start: number; end: number }>,
) {
  let cursor = start;
  let result = '';
  for (const range of ignoredRanges) {
    if (range.end <= start || range.start >= end) continue;
    const removeStart = Math.max(start, range.start);
    const removeEnd = Math.min(end, range.end);
    result += rawText.slice(cursor, removeStart);
    cursor = Math.max(cursor, removeEnd);
  }
  return (result + rawText.slice(cursor, end)).replace(/^[ \t]+|[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

export function detectChapters(
  rawText: string,
  ignoredRanges: Array<{ start: number; end: number }> = [],
) {
  const text = rawText.replace(/\r\n?/g, '\n');
  const masked = [...text];
  for (const range of ignoredRanges) {
    for (let index = range.start; index < Math.min(range.end, masked.length); index += 1) {
      if (masked[index] !== '\n') masked[index] = ' ';
    }
  }
  const lines = masked.join('').split('\n');
  const candidates: Array<{ title: string; start: number; lineEnd: number; confidence: number }> =
    [];
  let offset = 0;
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line && line.length <= 120 && HEADING.test(line)) {
      const beforeBlank = index === 0 || !lines[index - 1].trim();
      const afterBlank = index === lines.length - 1 || !lines[index + 1].trim();
      candidates.push({
        title: line,
        start: offset,
        lineEnd: offset + rawLine.length,
        confidence: confidenceFor(line, beforeBlank, afterBlank),
      });
    }
    offset += rawLine.length + (index < lines.length - 1 ? 1 : 0);
  });

  let unassignedText = '';
  const chapters: ImportChapter[] = [];
  if (!candidates.length) {
    chapters.push({
      id: randomUUID(),
      title: '1-bob',
      content: withoutRanges(text, 0, text.length, ignoredRanges),
      sourceText: text,
      order: 1,
      confidence: 0.25,
      sourceStart: 0,
      sourceEnd: text.length,
    });
  } else {
    const prefixWithoutFurniture = withoutRanges(
      text,
      0,
      candidates[0].start,
      ignoredRanges,
    );
    if (candidates[0].start > 0 && prefixWithoutFurniture) {
      unassignedText = text.slice(0, candidates[0].start);
    }
    candidates.forEach((candidate, index) => {
      const end = candidates[index + 1]?.start ?? text.length;
      const sourceStart = index === 0 && !prefixWithoutFurniture ? 0 : candidate.start;
      const sourceText = text.slice(sourceStart, end);
      const content = withoutRanges(
        text,
        Math.min(candidate.lineEnd + 1, end),
        end,
        ignoredRanges,
      );
      chapters.push({
        id: randomUUID(),
        title: candidate.title,
        content,
        sourceText,
        order: index + 1,
        confidence: candidate.confidence,
        sourceStart,
        sourceEnd: end,
      });
    });
  }
  return { chapters, unassignedText };
}

export function validateIntegrity(
  rawText: string,
  chapters: ImportChapter[],
  unassignedText: string,
  metadataText = '',
): ImportStats {
  const ordered = [...chapters].sort((a, b) => a.sourceStart - b.sourceStart);
  const reconstructed =
    unassignedText + ordered.map((chapter) => chapter.sourceText || '').join('') + metadataText;
  const original = normalizeForIntegrity(rawText);
  const rebuilt = normalizeForIntegrity(reconstructed);
  const assignedCharacters = ordered.reduce(
    (sum, chapter) => sum + (chapter.sourceText?.length || 0),
    0,
  );
  return {
    pageCount: 0,
    originalCharacters: rawText.length,
    originalWords: original ? original.split(/\s+/u).length : 0,
    assignedCharacters,
    metadataCharacters: metadataText.length,
    unassignedCharacters: unassignedText.length,
    coverage: rawText.length
      ? (assignedCharacters + metadataText.length + unassignedText.length) / rawText.length
      : 0,
    fingerprint: fingerprint(original),
    ...(fingerprint(original) === fingerprint(rebuilt) ? {} : { coverage: 0 }),
  };
}

export function splitChapter(
  chapter: ImportChapter,
  position: number,
): [ImportChapter, ImportChapter] {
  if (position <= 0 || position >= chapter.content.length)
    throw new Error('Ajratish joyi noto‘g‘ri');
  const ratio = position / Math.max(1, chapter.content.length);
  const sourcePosition = Math.round(
    chapter.sourceStart + (chapter.sourceEnd - chapter.sourceStart) * ratio,
  );
  return [
    {
      ...chapter,
      content: chapter.content.slice(0, position),
      sourceText: (chapter.sourceText || '').slice(0, sourcePosition - chapter.sourceStart),
      sourceEnd: sourcePosition,
    },
    {
      ...chapter,
      id: randomUUID(),
      title: `${chapter.title} — davom`,
      content: chapter.content.slice(position),
      sourceText: (chapter.sourceText || '').slice(sourcePosition - chapter.sourceStart),
      sourceStart: sourcePosition,
      order: chapter.order + 1,
    },
  ];
}

export function mergeChapters(first: ImportChapter, second: ImportChapter): ImportChapter {
  return {
    ...first,
    content: `${first.content}\n\n${second.content}`,
    sourceText: (first.sourceText || '') + (second.sourceText || ''),
    sourceEnd: second.sourceEnd,
    confidence: Math.min(first.confidence, second.confidence),
  };
}
