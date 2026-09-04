/**
 * High-performance deterministic reader pagination engine.
 *
 * Requirements:
 * - Target approximately 200 words per page.
 * - Never split in the middle of a word.
 * - Preserve whole paragraphs and HTML formatting (headings, quotes, lists, bold, italic).
 * - Pages may slightly exceed 200 words to preserve paragraph boundaries.
 * - Zero words lost, zero words duplicated.
 * - Deterministic: returning readers always arrive at the exact same logical page.
 */

export interface PaginatedChapter {
  pages: string[];
  totalWords: number;
  totalPages: number;
}

/**
 * Counts words accurately by stripping HTML tags and entities.
 */
export function countHtmlWords(html: string): number {
  if (!html) return 0;
  const clean = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Extracts top-level HTML blocks from rich text.
 * Falls back to newline-separated paragraphs if standard blocks are absent.
 */
function extractHtmlBlocks(html: string): string[] {
  if (!html || !html.trim()) return [];

  // Match standard block elements
  const blockRegex = /<(p|h[1-6]|blockquote|ul|ol|pre|table|div)[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    // If there is intervening non-whitespace text before this block, capture it as a paragraph
    if (match.index > lastIndex) {
      const textBetween = html.substring(lastIndex, match.index).trim();
      if (textBetween) {
        blocks.push(`<p>${textBetween}</p>`);
      }
    }
    blocks.push(match[0]);
    lastIndex = blockRegex.lastIndex;
  }

  // Intervening text after last block
  if (lastIndex < html.length) {
    const trailingText = html.substring(lastIndex).trim();
    if (trailingText) {
      blocks.push(`<p>${trailingText}</p>`);
    }
  }

  // If no HTML blocks found, split plain text by double newlines
  if (blocks.length === 0) {
    const rawParagraphs = html
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParagraphs.length === 0 && html.trim()) {
      return [`<p>${html.trim()}</p>`];
    }

    return rawParagraphs.map((p) => `<p>${p}</p>`);
  }

  return blocks;
}

/**
 * Splits an excessively long paragraph (>350 words) at sentence boundaries
 * while preserving formatting.
 */
function splitLongParagraph(block: string, targetWords: number): string[] {
  const wordCount = countHtmlWords(block);
  if (wordCount <= 350) {
    return [block];
  }

  // Extract tag name and inner content
  const match = block.match(/^<([a-z0-9]+)([^>]*)>([\s\S]*)<\/\1>$/i);
  if (!match) return [block];

  const tagName = match[1];
  const attributes = match[2];
  const innerHtml = match[3];

  // Split into sentences preserving punctuation
  const sentences = innerHtml.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [innerHtml];
  const subBlocks: string[] = [];
  let currentSentences: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sWords = countHtmlWords(sentence);
    if (currentSentences.length > 0 && currentWords + sWords > targetWords) {
      subBlocks.push(`<${tagName}${attributes}>${currentSentences.join('').trim()}</${tagName}>`);
      currentSentences = [sentence];
      currentWords = sWords;
    } else {
      currentSentences.push(sentence);
      currentWords += sWords;
    }
  }

  if (currentSentences.length > 0) {
    subBlocks.push(`<${tagName}${attributes}>${currentSentences.join('').trim()}</${tagName}>`);
  }

  return subBlocks.length > 0 ? subBlocks : [block];
}

/**
 * Paginates chapter HTML content deterministically into ~200 word pages.
 */
export function paginateChapterContent(
  htmlContent: string,
  targetWordsPerPage: number = 200,
): PaginatedChapter {
  if (!htmlContent || !htmlContent.trim()) {
    return {
      pages: [''],
      totalWords: 0,
      totalPages: 1,
    };
  }

  const totalWords = countHtmlWords(htmlContent);

  // If content is 200 words or less, single page presentation
  if (totalWords <= targetWordsPerPage) {
    return {
      pages: [htmlContent],
      totalWords,
      totalPages: 1,
    };
  }

  const rawBlocks = extractHtmlBlocks(htmlContent);
  const blocks: string[] = [];

  // Expand any oversized paragraphs
  for (const block of rawBlocks) {
    const split = splitLongParagraph(block, targetWordsPerPage);
    blocks.push(...split);
  }

  const pages: string[] = [];
  let currentPageBlocks: string[] = [];
  let currentWordCount = 0;

  for (const block of blocks) {
    const blockWords = countHtmlWords(block);

    // If adding this block exceeds target AND current page already has a reasonable chunk (>= 120 words),
    // finalize current page and start a new one.
    if (
      currentPageBlocks.length > 0 &&
      currentWordCount + blockWords > targetWordsPerPage &&
      currentWordCount >= 120
    ) {
      pages.push(currentPageBlocks.join(''));
      currentPageBlocks = [block];
      currentWordCount = blockWords;
    } else {
      currentPageBlocks.push(block);
      currentWordCount += blockWords;
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join(''));
  }

  return {
    pages: pages.length > 0 ? pages : [htmlContent],
    totalWords,
    totalPages: Math.max(1, pages.length),
  };
}
