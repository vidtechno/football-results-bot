import { formatUZS } from './currency';

export interface TelegramTopupMessageParams {
  userName: string;
  publicId: string;
  email?: string | null;
  currentBalance: number;
  itemTitle?: string | null;
  itemType?: 'work' | 'chapter' | null;
  itemPrice?: number | null;
  missingAmount?: number | null;
  requestedAmount?: number | null;
}

/**
 * Generates a clean, polite, and comprehensive Telegram message in Uzbek Latin
 * for manual balance top-up coordination between reader and administrator.
 * Excludes any passwords, tokens or private authentication secrets.
 */
export function generateTelegramTopupMessage(params: TelegramTopupMessageParams): string {
  const {
    userName,
    publicId,
    email,
    currentBalance,
    itemTitle,
    itemType,
    itemPrice,
    missingAmount,
    requestedAmount,
  } = params;

  const topupTarget = requestedAmount && requestedAmount > 0
    ? requestedAmount
    : missingAmount && missingAmount > 0
    ? missingAmount
    : 10000;

  const lines: string[] = [
    'Assalomu alaykum, Manbora ma’muri!',
    '',
    'Men Manbora hisobimni to‘ldirmoqchiman.',
    '',
    '👤 Foydalanuvchi ma’lumotlari:',
    `• Ism: ${userName || 'Foydalanuvchi'}`,
    `• Manbora ID: ${publicId || 'Noma’lum'}`,
  ];

  if (email && email.trim() !== '') {
    lines.push(`• Email: ${email.trim()}`);
  }

  lines.push(`• Joriy balans: ${formatUZS(currentBalance)}`);

  if (itemTitle && itemTitle.trim() !== '') {
    const typeLabel = itemType === 'chapter' ? 'Bob' : 'Asar';
    lines.push('');
    lines.push('📖 Xarid qilinayotgan kontent:');
    lines.push(`• ${typeLabel}: "${itemTitle.trim()}"`);
    if (typeof itemPrice === 'number' && itemPrice > 0) {
      lines.push(`• Narxi: ${formatUZS(itemPrice)}`);
    }
    if (typeof missingAmount === 'number' && missingAmount > 0) {
      lines.push(`• Yetishmayotgan summa: ${formatUZS(missingAmount)}`);
    }
  }

  lines.push('');
  lines.push(`💳 To‘ldirish summasi: ${formatUZS(topupTarget)}`);
  lines.push('');
  lines.push('Iltimos, to‘lov uchun karta raqamini yuborsangiz. To‘lovni amalga oshirib, chekni yuboraman.');

  return lines.join('\n');
}

/**
 * Returns the administrative Telegram contact username configured via environment.
 * Falls back to a placeholder identifier without exposing personal secrets in source code.
 */
export function getAdminTelegramUsername(): string {
  const envUsername = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_USERNAME;
  if (envUsername && envUsername.trim() !== '') {
    return envUsername.trim().replace(/^@/, '');
  }
  return 'manbora_admin';
}

/**
 * Constructs a secure direct Telegram web link with the pre-filled message text.
 */
export function getAdminTelegramUrl(messageText: string): string {
  const username = getAdminTelegramUsername();
  return `https://t.me/${encodeURIComponent(username)}?text=${encodeURIComponent(messageText)}`;
}
