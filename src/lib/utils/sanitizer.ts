/**
 * Strict server & client rich-text HTML sanitizer for Manbora.
 * Allows only safe semantic editorial markup:
 * <p>, <h2>, <h3>, <h4>, <blockquote>, <ul>, <ol>, <li>, <strong>, <em>, <u>, <hr>, <br>
 * Strictly strips scripts, iframes, objects, inputs, event handlers, and arbitrary styles.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'h2',
  'h3',
  'h4',
  'blockquote',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'u',
  'hr',
  'br',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

const ALLOWED_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);

/**
 * Sanitizes rich text HTML content.
 */
export function sanitizeRichText(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let sanitized = html
    // 1. Remove dangerous blocks entirely (script, style, iframe, object, embed, etc.)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // 2. Remove all event handlers (e.g. onclick, onload, onerror)
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^ >]+/gi, '')
    // 3. Remove javascript: or data: pseudoprotocols
    .replace(/javascript:[^"'>]*/gi, '')
    .replace(/data:[^"'>]*/gi, '');

  // 4. Parse tags and retain only allowed tags with safe attributes
  sanitized = sanitized.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const lowerTag = tagName.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!ALLOWED_TAGS.has(lowerTag)) {
      return ''; // Strip disallowed tags
    }

    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Handle self-closing
    if (lowerTag === 'hr') return '<hr />';
    if (lowerTag === 'br') return '<br />';
    if (lowerTag === 'img') {
      const src = attrs.match(/\bsrc\s*=\s*["'](https:\/\/[^"']+)["']/i)?.[1];
      if (!src) return '';
      const alt = (attrs.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] || '')
        .replace(/[<>]/g, '')
        .slice(0, 200);
      const rawWidth = attrs.match(/\bdata-width\s*=\s*["'](25|50|75|100)["']/i)?.[1] || '100';
      const rawAlign =
        attrs.match(/\bdata-align\s*=\s*["'](left|center|right)["']/i)?.[1] || 'center';
      return `<img src="${src}" alt="${alt}" data-width="${rawWidth}" data-align="${rawAlign}" loading="lazy" decoding="async" />`;
    }

    // Check style or class for safe text-align
    let safeAttrs = '';
    const styleMatch = attrs.match(/text-align\s*:\s*(left|center|right|justify)/i);
    const classMatch = attrs.match(
      /class\s*=\s*["']([^"']*text-(left|center|right|justify)[^"']*)["']/i,
    );

    if (classMatch) {
      const alignMatch = classMatch[1].match(/\btext-(left|center|right|justify)\b/);
      if (alignMatch) {
        safeAttrs += ` class="text-${alignMatch[1]}"`;
      }
    } else if (styleMatch && ALLOWED_ALIGNMENTS.has(styleMatch[1].toLowerCase())) {
      safeAttrs += ` style="text-align: ${styleMatch[1].toLowerCase()};"`;
    }

    return `<${lowerTag}${safeAttrs}>`;
  });

  return sanitized.trim();
}

/**
 * Calculates word count and character count from rich text HTML.
 * Correctly handles block separation, HTML entity decoding, whitespace normalization,
 * and preserves Uzbek Latin apostrophe words (o‘, g‘, tutuq belgisi, etc.).
 */
export function getRichTextStats(html: string): {
  wordCount: number;
  charCount: number;
  words: number;
  characters: number;
  readMinutes: number;
} {
  if (!html || typeof html !== 'string') {
    return { wordCount: 0, charCount: 0, words: 0, characters: 0, readMinutes: 0 };
  }

  // 1. Separate block elements with whitespace so adjoining blocks don't fuse words
  let text = html
    .replace(/<\/(p|div|h[1-6]|blockquote|li|tr|section|article)>/gi, ' ')
    .replace(/<(br|hr)\s*\/?>/gi, ' ');

  // 2. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 3. Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // 4. Normalize multiple whitespaces into a single space
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    return { wordCount: 0, charCount: 0, words: 0, characters: 0, readMinutes: 0 };
  }

  const charCount = normalizedText.length;

  // 5. Match words: supports Unicode letters, numbers, and internal Uzbek apostrophes (', ‘, ’, ʻ, ʼ)
  // E.g. "o‘qituvchi", "g‘alaba", "san'at", "ta'sir", "do'st" count as 1 word each.
  const matchedWords = normalizedText.match(/[\p{L}\p{N}]+(?:['‘'’ʻʼ][\p{L}\p{N}]+)*/gu);
  const wordCount = matchedWords ? matchedWords.length : 0;
  const readMinutes = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  return {
    wordCount,
    charCount,
    words: wordCount,
    characters: charCount,
    readMinutes,
  };
}
