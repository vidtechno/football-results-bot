import { createHash, randomUUID } from 'node:crypto';
import mammoth from 'mammoth';
import yauzl from 'yauzl';
import { sanitizeRichText } from '@/lib/utils/sanitizer';
import type { DocxChapter, DocxImportStats } from './types';
import { htmlToPlainText, normalizeDocxText } from './text';

const REQUIRED_ENTRIES = new Set(['[Content_Types].xml', 'word/document.xml']);
const MAX_ZIP_ENTRIES = 2_000;
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_SINGLE_ENTRY_BYTES = 20 * 1024 * 1024;

const CHAPTER_PATTERN = new RegExp(
  String.raw`^(?:(?:\d{1,4}\s*[-.]?\s*(?:bob|боб))|(?:[ivxlcdm]+\s+(?:bob|боб))|(?:(?:birinchi|ikkinchi|uchinchi|to['’‘ʻ]?rtinchi|beshinchi|oltinchi|yettinchi|sakkizinchi|to['’‘ʻ]?qqizinchi|o['’‘ʻ]?ninchi|биринчи|иккинчи|учинчи|тўртинчи|бешинчи|олтинчи|еттинчи|саккизинчи|тўққизинчи|ўнинчи)\s+(?:bob|боб|qism|қисм))|(?:(?:bob|боб|chapter)\s+\d{1,4})|(?:\d{1,4}\.\s+\S.{0,120}))$`,
  'iu',
);

type HtmlBlock = { tag: string; html: string; text: string };

function fingerprint(value: string) {
  return createHash('sha256').update(normalizeDocxText(value), 'utf8').digest('hex');
}

export function validateDocxIntegrity(
  originalText: string,
  chapters: DocxChapter[],
  paragraphCount: number,
): DocxImportStats {
  const original = normalizeDocxText(originalText);
  const final = normalizeDocxText(chapters.map((chapter) => chapter.plainText).join('\n'));
  const originalWords = original ? original.split(/\s+/u).length : 0;
  const finalWords = final ? final.split(/\s+/u).length : 0;
  const characterRetention = original.length ? final.length / original.length : 0;
  const wordRetention = originalWords ? finalWords / originalWords : 0;
  const textRetention = Math.min(characterRetention, wordRetention);
  return {
    originalCharacters: original.length,
    originalWords,
    finalCharacters: final.length,
    finalWords,
    paragraphCount,
    chapterCount: chapters.length,
    textRetention,
    suspiciousLoss:
      !original ||
      !final ||
      textRetention < 0.985 ||
      textRetention > 1.03 ||
      chapters.some((c) => !c.plainText.trim()),
    fingerprint: fingerprint(original),
  };
}

export async function inspectDocxArchive(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('INVALID_DOCX_SIGNATURE');
  }
  return new Promise<{ hasImages: boolean }>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(new Error('CORRUPT_DOCX'));
      let entries = 0;
      let totalSize = 0;
      let hasImages = false;
      const found = new Set<string>();
      const fail = (code: string) => {
        zip.close();
        reject(new Error(code));
      };
      zip.on('entry', (entry) => {
        entries += 1;
        totalSize += entry.uncompressedSize;
        found.add(entry.fileName);
        if (/^(?:EncryptionInfo|EncryptedPackage)$/i.test(entry.fileName)) {
          return fail('ENCRYPTED_DOCX');
        }
        if (entry.fileName.startsWith('word/media/')) hasImages = true;
        if (
          entries > MAX_ZIP_ENTRIES ||
          totalSize > MAX_UNCOMPRESSED_BYTES ||
          entry.uncompressedSize > MAX_SINGLE_ENTRY_BYTES
        ) {
          return fail('DOCX_ARCHIVE_LIMIT');
        }
        zip.readEntry();
      });
      zip.on('error', () => reject(new Error('CORRUPT_DOCX')));
      zip.on('end', () => {
        if ([...REQUIRED_ENTRIES].some((name) => !found.has(name))) {
          return reject(new Error('INVALID_DOCX_STRUCTURE'));
        }
        resolve({ hasImages });
      });
      zip.readEntry();
    });
  });
}

function extractBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = [];
  const pattern = /<(h1|h2|p|ul|ol|blockquote)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;
  for (const match of html.matchAll(pattern)) {
    const text = htmlToPlainText(match[0]);
    if (text) blocks.push({ tag: match[1].toLowerCase(), html: match[0], text });
  }
  return blocks;
}

function buildChapters(blocks: HtmlBlock[], fallbackTitle: string) {
  const styledHeadings = blocks.filter((block) => block.tag === 'h1' || block.tag === 'h2').length;
  const candidates = blocks.map((block, index) => ({
    index,
    isHeading:
      block.tag === 'h1' ||
      block.tag === 'h2' ||
      (styledHeadings === 0 && CHAPTER_PATTERN.test(block.text)),
    confidence: block.tag === 'h1' ? 0.99 : block.tag === 'h2' ? 0.95 : 0.82,
  }));
  const headingIndexes = candidates.filter((item) => item.isHeading).map((item) => item.index);
  if (!headingIndexes.length) {
    const contentHtml = blocks.map((block) => block.html).join('');
    return {
      headingIndexes,
      chapters: [
        {
          id: randomUUID(),
          title: fallbackTitle || '1-bob',
          contentHtml,
          plainText: htmlToPlainText(contentHtml),
          order: 1,
          confidence: 0.35,
        },
      ],
    };
  }

  return {
    headingIndexes,
    chapters: headingIndexes.map((headingIndex, order): DocxChapter => {
      const nextHeading = headingIndexes[order + 1] ?? blocks.length;
      const contentBlocks = blocks.slice(headingIndex + 1, nextHeading);
      if (order === 0 && headingIndex > 0) contentBlocks.unshift(...blocks.slice(0, headingIndex));
      const contentHtml = contentBlocks.map((block) => block.html).join('');
      return {
        id: randomUUID(),
        title: blocks[headingIndex].text.slice(0, 180),
        contentHtml,
        plainText: htmlToPlainText(contentHtml),
        order: order + 1,
        confidence: candidates[headingIndex].confidence,
      };
    }),
  };
}

export async function parseDocx(buffer: Buffer, fallbackTitle: string) {
  const archive = await inspectDocxArchive(buffer);
  const [htmlResult, rawResult] = await Promise.all([
    mammoth.convertToHtml(
      { buffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Quote'] => blockquote:fresh",
        ],
        includeDefaultStyleMap: true,
      },
    ),
    mammoth.extractRawText({ buffer }),
  ]);
  const cleanedHtml = sanitizeRichText(
    htmlResult.value
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<h1(?:\s[^>]*)?>/gi, '<h2>')
      .replace(/<\/h1>/gi, '</h2>'),
  );
  const blocks = extractBlocks(cleanedHtml);
  if (!blocks.length) throw new Error('EMPTY_DOCX');
  const built = buildChapters(blocks, fallbackTitle);
  const chapters = built.chapters;
  const importedBody = chapters.map((chapter) => chapter.plainText).join('\n');
  // Heading labels are structural metadata and are intentionally not duplicated
  // inside chapter bodies. Compare body output against converted body blocks.
  const expectedBody = blocks
    .filter((_, index) => !built.headingIndexes.includes(index))
    .map((block) => block.text)
    .join('\n');
  const stats = validateDocxIntegrity(expectedBody || rawResult.value, chapters, blocks.length);
  if (stats.suspiciousLoss) throw new Error('DOCX_TEXT_LOSS');
  const warnings = [
    ...htmlResult.messages.map((message) => message.message).slice(0, 10),
    ...(archive.hasImages ? ['DOCX ichidagi rasmlar hozir import qilinmaydi.'] : []),
  ];
  return {
    rawText: rawResult.value,
    expectedBodyText: expectedBody || importedBody,
    chapters,
    statistics: stats,
    warnings,
  };
}

export function isChapterPattern(value: string) {
  return CHAPTER_PATTERN.test(value.trim());
}
