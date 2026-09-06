/**
 * Manbora Social Links Sanitizer & Normalizer
 * Validates and normalizes user social links against strict whitelists:
 * Telegram, Instagram, YouTube, and personal Website.
 * Strictly rejects malicious schemes (javascript:, data:, vbscript:, etc.).
 */

export interface RawSocialLinks {
  telegram?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  website?: string | null;
}

export interface SanitizedSocialLinks {
  telegram?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

export interface SocialValidationResult {
  valid: boolean;
  links: SanitizedSocialLinks;
  errors: Partial<Record<keyof RawSocialLinks, string>>;
}

const MALICIOUS_SCHEMES_REGEX = /^(javascript|data|vbscript|file|blob|about):/i;

/**
 * Normalizes and validates a Telegram link/handle.
 * Accepts: @username, t.me/username, https://t.me/username, username
 */
export function sanitizeTelegram(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (MALICIOUS_SCHEMES_REGEX.test(trimmed)) return null;

  let handle = trimmed;
  // If full url
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{3,32})\/?$/i);
  if (urlMatch) {
    handle = urlMatch[1];
  } else {
    handle = handle.replace(/^@/, '');
  }

  // Validate handle format (Telegram handles: 3-32 alphanumeric or underscores)
  if (/^[a-zA-Z0-9_]{3,32}$/.test(handle)) {
    return `https://t.me/${handle}`;
  }

  return null;
}

/**
 * Normalizes and validates an Instagram link/handle.
 * Accepts: @username, instagram.com/username, https://instagram.com/username, username
 */
export function sanitizeInstagram(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (MALICIOUS_SCHEMES_REGEX.test(trimmed)) return null;

  let handle = trimmed;
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?(?:\?.*)?$/i);
  if (urlMatch) {
    handle = urlMatch[1];
  } else {
    handle = handle.replace(/^@/, '');
  }

  if (/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    return `https://instagram.com/${handle}`;
  }

  return null;
}

/**
 * Normalizes and validates a YouTube channel link/handle.
 * Accepts: @handle, youtube.com/@handle, https://youtube.com/@handle, or full channel URL
 */
export function sanitizeYoutube(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (MALICIOUS_SCHEMES_REGEX.test(trimmed)) return null;

  // If starts with @
  if (/^@[a-zA-Z0-9._-]{2,30}$/.test(trimmed)) {
    return `https://youtube.com/${trimmed}`;
  }

  // If handle without @ (alphanumeric)
  if (/^[a-zA-Z0-9._-]{2,30}$/.test(trimmed) && !trimmed.includes('.')) {
    return `https://youtube.com/@${trimmed}`;
  }

  // Check URL
  try {
    const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(fullUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'youtu.be') {
      return `https://${host}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Normalizes and validates a personal website URL.
 * Strictly requires http or https.
 * Rejects javascript:, data:, file:, etc.
 */
export function sanitizeWebsite(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (MALICIOUS_SCHEMES_REGEX.test(trimmed)) return null;

  try {
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }

    // Must have a valid hostname with at least one dot (e.g., example.com, portfolio.uz)
    if (!parsed.hostname || !parsed.hostname.includes('.') || parsed.hostname.length < 4) {
      return null;
    }

    // Must not contain forbidden characters
    if (/[<>'"\s]/.test(withProtocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validates and normalizes all provided social links.
 * Returns clean object containing only valid non-empty links.
 */
export function validateAndSanitizeSocialLinks(raw: RawSocialLinks): SocialValidationResult {
  const links: SanitizedSocialLinks = {};
  const errors: Partial<Record<keyof RawSocialLinks, string>> = {};

  if (raw.telegram && raw.telegram.trim()) {
    const sanitized = sanitizeTelegram(raw.telegram);
    if (sanitized) {
      links.telegram = sanitized;
    } else {
      errors.telegram = 'Telegram username yoki havola noto‘g‘ri kiritildi';
    }
  }

  if (raw.instagram && raw.instagram.trim()) {
    const sanitized = sanitizeInstagram(raw.instagram);
    if (sanitized) {
      links.instagram = sanitized;
    } else {
      errors.instagram = 'Instagram username yoki havola noto‘g‘ri kiritildi';
    }
  }

  if (raw.youtube && raw.youtube.trim()) {
    const sanitized = sanitizeYoutube(raw.youtube);
    if (sanitized) {
      links.youtube = sanitized;
    } else {
      errors.youtube = 'YouTube kanali yoki havola noto‘g‘ri kiritildi';
    }
  }

  if (raw.website && raw.website.trim()) {
    const sanitized = sanitizeWebsite(raw.website);
    if (sanitized) {
      links.website = sanitized;
    } else {
      errors.website = 'Veb-sayt manzili xato yoki xavfsiz emas (https://... talab qilinadi)';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    links,
    errors,
  };
}
