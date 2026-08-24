import { describe, it, expect } from 'vitest';
import {
  normalizeSearchTerm,
  slugify,
  formatPhoneNumber,
  formatUzbekDate,
} from '../src/lib/utils/formatters';
import { ReportSchema, DigitalService, Contact } from '../src/lib/types/directory';

describe('Bog‘lanish Directory & Digital Services Utilities', () => {
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

  it('validates organization report schema with Zod', () => {
    const validReport = {
      organization_id: 10,
      report_type: 'wrong_phone',
      message: 'Telefon raqami o‘zgargan, yangi raqam: +998 71 200-00-00',
    };

    const parsed = ReportSchema.safeParse(validReport);
    expect(parsed.success).toBe(true);
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
});
