/**
 * Check if an organization's verification timestamp is within the last 30 days
 */
export function isNewlyVerified(lastVerifiedAt?: string | null): boolean {
  if (!lastVerifiedAt) return false;
  try {
    const verifiedDate = new Date(lastVerifiedAt).getTime();
    if (isNaN(verifiedDate)) return false;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    const diff = Date.now() - verifiedDate;
    return diff >= 0 && diff <= thirtyDaysInMs;
  } catch {
    return false;
  }
}

/**
 * Generate Telegram share link for public organization profile
 */
export function getTelegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/**
 * Generate WhatsApp share link for public organization profile
 */
export function getWhatsappShareUrl(url: string, text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`;
}
