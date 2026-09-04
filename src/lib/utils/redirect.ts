/**
 * Validates and sanitizes internal redirect URLs to prevent open redirect attacks.
 * Only relative local paths starting with a single '/' are permitted.
 * Protocol-relative ('//'), backslash ('/\\'), external protocols ('http:', 'https:', 'javascript:'),
 * and control characters are strictly rejected.
 */
export function getSafeRedirectUrl(url?: string | null, fallback = '/kabinet'): string {
  if (!url || typeof url !== 'string') {
    return fallback;
  }

  // Reject newlines, carriage returns, tabs, or null bytes anywhere in the input (header injection prevention)
  if (/[\r\n\t\0]/.test(url)) {
    return fallback;
  }

  const trimmed = url.trim();

  // Reject empty string
  if (!trimmed) {
    return fallback;
  }

  // Must start with exactly one forward slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject any embedded scheme like '/http:' or '/javascript:'
  if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
