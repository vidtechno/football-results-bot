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

    // Check style or class for safe text-align
    let safeAttrs = '';
    const styleMatch = attrs.match(/text-align\s*:\s*(left|center|right|justify)/i);
    const classMatch = attrs.match(/class\s*=\s*["']([^"']*text-(left|center|right|justify)[^"']*)["']/i);

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
 */
export function getRichTextStats(html: string): { wordCount: number; charCount: number } {
  if (!html) return { wordCount: 0, charCount: 0 };

  // Strip all HTML tags to get pure text content
  const cleanText = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  const charCount = cleanText.length;
  const wordCount = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;

  return { wordCount, charCount };
}
