import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const TASHKENT_TZ = 'Asia/Tashkent';

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

const UZ_WEEKDAYS: Record<number, string> = {
  0: 'Yakshanba',
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
};

export function getTashkentDate(dateInput: string | Date): Date {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return toZonedTime(date, TASHKENT_TZ);
}

/**
 * Format date in Tashkent timezone in Uzbek: "25-Avgust, 2026"
 */
export function formatUzbekDate(dateInput: string | Date): string {
  try {
    const zoned = getTashkentDate(dateInput);
    const day = zoned.getDate();
    const month = UZ_MONTHS[zoned.getMonth()] || '';
    const year = zoned.getFullYear();
    return `${day}-${month}, ${year}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format date with weekday in Uzbek: "Dushanba, 25-Avgust"
 */
export function formatUzbekDateWithWeekday(dateInput: string | Date): string {
  try {
    const zoned = getTashkentDate(dateInput);
    const weekday = UZ_WEEKDAYS[zoned.getDay()] || '';
    const day = zoned.getDate();
    const month = UZ_MONTHS[zoned.getMonth()] || '';
    return `${weekday}, ${day}-${month}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Format time in Tashkent timezone: "21:45"
 */
export function formatUzbekTime(dateInput: string | Date): string {
  try {
    const zoned = getTashkentDate(dateInput);
    return formatTz(zoned, 'HH:mm', { timeZone: TASHKENT_TZ });
  } catch {
    return '00:00';
  }
}

/**
 * Format date and time: "25-Avgust, 21:45"
 */
export function formatUzbekDateTime(dateInput: string | Date): string {
  try {
    const datePart = formatUzbekDate(dateInput);
    const timePart = formatUzbekTime(dateInput);
    return `${datePart} - ${timePart}`;
  } catch {
    return String(dateInput);
  }
}

export interface FixtureStatusFormatted {
  label: string;
  shortLabel: string;
  isLive: boolean;
  isFinished: boolean;
  isPostponed: boolean;
  badgeText: string;
  badgeClass: string;
}

/**
 * Map API-Football status code to Uzbek status representation
 */
export function mapFixtureStatus(status: string, statusShort?: string): FixtureStatusFormatted {
  const code = (statusShort || status || 'NS').toUpperCase().trim();

  // In-progress / Live matches
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PLAY'].includes(code)) {
    let detail = '🟢 O‘yin bo‘lmoqda';
    if (code === 'HT') detail = 'Tanaffus';
    if (code === '1H') detail = '1-bo‘lim';
    if (code === '2H') detail = '2-bo‘lim';
    if (code === 'ET') detail = 'Qo‘shimcha bo‘lim';
    if (code === 'P') detail = 'Penaltilar seriyasi';

    return {
      label: '🟢 O‘yin bo‘lmoqda',
      shortLabel: detail,
      isLive: true,
      isFinished: false,
      isPostponed: false,
      badgeText: '🟢 O‘yin bo‘lmoqda',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    };
  }

  // Finished matches
  if (['FT', 'AET', 'PEN'].includes(code)) {
    let detail = 'Tugadi';
    if (code === 'AET') detail = 'Qo‘shimcha vaqtda tugadi';
    if (code === 'PEN') detail = 'Penaltilarda tugadi';

    return {
      label: 'Tugadi',
      shortLabel: detail,
      isLive: false,
      isFinished: true,
      isPostponed: false,
      badgeText: 'Tugadi',
      badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    };
  }

  // Postponed / Cancelled matches
  if (['PST', 'CANC', 'ABD', 'WO', 'INT'].includes(code)) {
    let label = 'Qoldirildi';
    if (['CANC', 'ABD'].includes(code)) label = 'Bekor qilindi';
    if (code === 'WO') label = 'Texnik mag‘lubiyat';

    return {
      label,
      shortLabel: label,
      isLive: false,
      isFinished: false,
      isPostponed: true,
      badgeText: label,
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
  }

  // Scheduled / Not started (NS, TBD)
  return {
    label: 'Boshlanmagan',
    shortLabel: 'Boshlanmagan',
    isLive: false,
    isFinished: false,
    isPostponed: false,
    badgeText: 'Boshlanmagan',
    badgeClass: 'bg-slate-800/60 text-slate-300 border-slate-700',
  };
}
