import { describe, it, expect } from 'vitest';
import {
  normalizeSearchTerm,
  slugify,
  formatPhoneNumber,
  formatUzbekDate,
} from '../src/lib/utils/formatters';
import { isNewlyVerified, getTelegramShareUrl, getWhatsappShareUrl } from '../src/lib/utils/badges';
import { ReportSchema, SuggestionSchema, DigitalService, Contact, OrganizationEmail, Organization } from '../src/lib/types/directory';
import { computePopularityScores, calculatePagination } from '../src/lib/db/directory';

describe('Manbora Directory & Digital Services Utilities', () => {
  it('normalizes search terms accurately', () => {
    expect(normalizeSearchTerm('  O‘zmilliybank (NBU)  ')).toBe('ozmilliybank nbu');
    expect(normalizeSearchTerm('Beeline - Uz!!')).toBe('beeline - uz');
    expect(normalizeSearchTerm('')).toBe('');
  });

  it('generates URL-friendly slugs for Uzbek Latin text', () => {
    expect(slugify('O‘zbekiston Respublikasi')).toBe('ozbekiston-respublikasi');
    expect(slugify('G‘aznachilik Xizmati')).toBe('gaznachilik-xizmati');
    expect(slugify('Toshkent shahar Suv ta’minoti')).toBe('toshkent-shahar-suv-taminoti');
  });

  it('formats Uzbek 12-digit phone numbers and short codes', () => {
    const phone1 = formatPhoneNumber('+998901234567');
    expect(phone1.display).toBe('+998 90 123-45-67');
    expect(phone1.href).toBe('tel:+998901234567');

    const phone2 = formatPhoneNumber('1154');
    expect(phone2.display).toBe('1154');
    expect(phone2.href).toBe('tel:1154');
  });

  it('formats Uzbek Latin dates', () => {
    const testDate = '2026-08-25T10:00:00.000Z';
    const formatted = formatUzbekDate(testDate);
    expect(formatted).toContain('25-Avgust, 2026');
  });

  it('evaluates newly verified 30-day rule correctly', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    expect(isNewlyVerified(tenDaysAgo)).toBe(true);
    expect(isNewlyVerified(fortyDaysAgo)).toBe(false);
    expect(isNewlyVerified(null)).toBe(false);
    expect(isNewlyVerified(undefined)).toBe(false);
  });

  it('generates valid social share URLs for Manbora', () => {
    const tgUrl = getTelegramShareUrl('https://manbora.uz/organizations/sqb', 'SQB Bank');
    expect(tgUrl).toContain('https://t.me/share/url?url=https%3A%2F%2Fmanbora.uz');
    expect(tgUrl).toContain('text=SQB%20Bank');

    const waUrl = getWhatsappShareUrl('https://manbora.uz/organizations/sqb', 'SQB Bank');
    expect(waUrl).toContain('https://api.whatsapp.com/send?text=SQB%20Bank');
  });

  it('validates organization report and suggestion schemas with Zod', () => {
    const validReport = {
      organization_id: 10,
      report_type: 'wrong_phone',
      message: 'Telefon raqami o‘zgargan, yangi raqam: +998 71 200-00-00',
    };

    const parsedReport = ReportSchema.safeParse(validReport);
    expect(parsedReport.success).toBe(true);

    const validSuggestion = {
      name: 'O‘zsuvta’minot AJ',
      phone_number: '+998 71 200-00-00',
      website_url: 'https://uzsuv.uz',
    };

    const parsedSuggestion = SuggestionSchema.safeParse(validSuggestion);
    expect(parsedSuggestion.success).toBe(true);
  });

  it('validates contact types and digital service purpose descriptions', () => {
    const mockContact: Contact = {
      id: 1,
      organization_id: 1,
      label: 'Call-Markaz',
      phone_number: '+998712004343',
      contact_type: 'call_center',
      source_url: 'https://nbu.uz',
      is_primary: true,
    };

    expect(mockContact.contact_type).toBe('call_center');

    const mockService: DigitalService = {
      id: 1,
      organization_id: 1,
      title: 'Milliy Mobile (Android)',
      description: 'Kartadan kartaga pul o‘tkazmalari, kommunal to‘lovlar va valyuta konvertatsiyasi ilovasi.',
      service_type: 'android_app',
      url: 'https://play.google.com/store/apps/details?id=uz.nbu.mobile',
      platform_name: 'Google Play',
      is_official: true,
      source_url: 'https://cbu.uz/en/credit-organizations/banks/',
      sort_order: 1,
    };

    expect(mockService.is_official).toBe(true);
    expect(mockService.description).toContain('pul o‘tkazmalari');
  });

  it('validates organization email structure and attributes', () => {
    const mockEmail: OrganizationEmail = {
      id: 1,
      organization_id: 1,
      email: 'info@nbu.uz',
      label: 'Umumiy murojaatlar',
      is_primary: true,
      is_verified: true,
      sort_order: 1,
    };

    expect(mockEmail.email).toBe('info@nbu.uz');
    expect(mockEmail.is_primary).toBe(true);
    expect(mockEmail.is_verified).toBe(true);
  });
});

describe('Real Popularity Scoring & Unique-Visitor Protection', () => {
  const publishedOrgs: Organization[] = [
    { id: 1, slug: 'nbu', name: 'O‘zmilliybank', status: 'published', is_verified: true, created_at: '', updated_at: '' },
    { id: 2, slug: 'sqb', name: 'Sanoat Qurilish Bank', status: 'published', is_verified: true, created_at: '', updated_at: '' },
    { id: 3, slug: 'draft-org', name: 'Loyiha Tashkilot', status: 'draft', is_verified: false, created_at: '', updated_at: '' },
  ];

  it('calculates popularity scores based on unique visitor hashes and filters non-published orgs', () => {
    const events = [
      // Visitor A clicks NBU 3 times (should count as 1 unique visitor)
      { organization_id: 1, visitor_hash: 'visitor_hash_A', event_type: 'profile_open' },
      { organization_id: 1, visitor_hash: 'visitor_hash_A', event_type: 'card_click' },
      { organization_id: 1, visitor_hash: 'visitor_hash_A', event_type: 'search_select' },

      // Visitor B & C click SQB (should count as 2 unique visitors)
      { organization_id: 2, visitor_hash: 'visitor_hash_B', event_type: 'profile_open' },
      { organization_id: 2, visitor_hash: 'visitor_hash_C', event_type: 'profile_open' },

      // Visitor D clicks draft org (should be ignored since org is draft)
      { organization_id: 3, visitor_hash: 'visitor_hash_D', event_type: 'profile_open' },
    ];

    const results = computePopularityScores(events, publishedOrgs, 5);

    expect(results).toHaveLength(2);
    expect(results[0].slug).toBe('sqb'); // 2 unique visitors
    expect(results[1].slug).toBe('nbu'); // 1 unique visitor
    expect(results.some((o) => o.slug === 'draft-org')).toBe(false);
  });

  it('returns an empty array when no events exist and never returns fake fallback items', () => {
    const results = computePopularityScores([], publishedOrgs, 5);
    expect(results).toHaveLength(0);
    expect(results).toEqual([]);
  });
});

describe('Category 20-Item Server-Side Pagination Logic', () => {
  it('calculates 20-item pagination boundaries for Page 1, Page 2, and final page', () => {
    // 45 items in total, 20 items per page => 3 pages total
    const totalCount = 45;

    // Page 1
    const p1 = calculatePagination(totalCount, 1, 20);
    expect(p1.totalPages).toBe(3);
    expect(p1.currentPage).toBe(1);
    expect(p1.startIndex).toBe(1);
    expect(p1.endIndex).toBe(20);

    // Page 2
    const p2 = calculatePagination(totalCount, 2, 20);
    expect(p2.currentPage).toBe(2);
    expect(p2.startIndex).toBe(21);
    expect(p2.endIndex).toBe(40);

    // Page 3 (Final Page)
    const p3 = calculatePagination(totalCount, 3, 20);
    expect(p3.currentPage).toBe(3);
    expect(p3.startIndex).toBe(41);
    expect(p3.endIndex).toBe(45);
  });

  it('safely handles invalid or out-of-range requested page numbers', () => {
    const totalCount = 35; // 2 pages total (1-20, 21-35)

    // Out of range upper bound (requested page 99 -> clamped to max page 2)
    const pUpper = calculatePagination(totalCount, 99, 20);
    expect(pUpper.currentPage).toBe(2);
    expect(pUpper.startIndex).toBe(21);
    expect(pUpper.endIndex).toBe(35);

    // Out of range lower bound (requested page 0 or -5 -> clamped to min page 1)
    const pLower = calculatePagination(totalCount, -5, 20);
    expect(pLower.currentPage).toBe(1);
    expect(pLower.startIndex).toBe(1);
    expect(pLower.endIndex).toBe(20);

    // NaN / invalid requested page -> defaults to page 1
    const pNaN = calculatePagination(totalCount, NaN, 20);
    expect(pNaN.currentPage).toBe(1);
  });

  it('handles empty category results accurately', () => {
    const pEmpty = calculatePagination(0, 1, 20);
    expect(pEmpty.totalPages).toBe(1);
    expect(pEmpty.currentPage).toBe(1);
    expect(pEmpty.startIndex).toBe(0);
    expect(pEmpty.endIndex).toBe(0);
  });
});

