/**
 * Normalize search term by lowercasing and stripping non-alphanumeric Uzbek characters
 */
export function normalizeSearchTerm(term: string): string {
  if (!term) return '';
  return term
    .toLowerCase()
    .trim()
    .replace(/['’‘`]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Generate URL-friendly slug with Uzbek Latin character replacement
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[gG]['’‘`]/g, 'g')
    .replace(/[oO]['’‘`]/g, 'o')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Clean and format phone numbers for display & tel: links
 */
export function formatPhoneNumber(phone: string): { display: string; href: string } {
  if (!phone) return { display: '', href: '' };

  const cleaned = phone.replace(/[^\d+]/g, '');

  // If short code (e.g., 1084, 1154, 1344)
  if (cleaned.length <= 5 && !cleaned.startsWith('+')) {
    return {
      display: cleaned,
      href: `tel:${cleaned}`,
    };
  }

  // Uzbek 12-digit number (+998XXXXXXXXX or 998XXXXXXXXX)
  const digitsOnly = cleaned.replace(/^\+/, '');
  if (digitsOnly.length === 12 && digitsOnly.startsWith('998')) {
    const code = digitsOnly.substring(3, 5);
    const part1 = digitsOnly.substring(5, 8);
    const part2 = digitsOnly.substring(8, 10);
    const part3 = digitsOnly.substring(10, 12);
    return {
      display: `+998 ${code} ${part1}-${part2}-${part3}`,
      href: `tel:+${digitsOnly}`,
    };
  }

  // Default display
  return {
    display: phone.trim(),
    href: `tel:${cleaned.startsWith('+') ? cleaned : '+' + cleaned}`,
  };
}

const UZ_MONTHS: Record<number, string> = {
  0: 'Yanvar',
  1: 'Fevral',
  2: 'Mart',
  3: 'Aprel',
  4: 'May',
  5: 'Iyun',
  6: 'Iyul',
  7: 'Avgust',
  8: 'Sentabr',
  9: 'Oktabr',
  10: 'Noyabr',
  11: 'Dekabr',
};

/**
 * Format date into Uzbek Latin string: "25-Avgust, 2026"
 */
export function formatUzbekDate(dateInput: string | Date): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);

    const day = d.getDate();
    const month = UZ_MONTHS[d.getMonth()] || '';
    const year = d.getFullYear();
    return `${day}-${month}, ${year}`;
  } catch {
    return String(dateInput);
  }
}
