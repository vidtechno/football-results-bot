import { describe, it, expect } from 'vitest';
import { formatUzbekDate, formatUzbekTime, mapFixtureStatus } from '../src/lib/utils/formatters';

describe('Uzbek Date & Time Formatters', () => {
  it('formats date correctly in Uzbek Latin', () => {
    // 2026-08-25T15:30:00Z -> 20:30 in Tashkent (UTC+5)
    const testDate = '2026-08-25T15:30:00.000Z';
    const formattedDate = formatUzbekDate(testDate);
    expect(formattedDate).toContain('25-Avgust, 2026');
  });

  it('formats time in Asia/Tashkent timezone (UTC+5)', () => {
    const testDate = '2026-08-25T15:30:00.000Z';
    const formattedTime = formatUzbekTime(testDate);
    expect(formattedTime).toBe('20:30');
  });

  it('maps live status codes correctly to Uzbek label and green badge', () => {
    const liveStatus = mapFixtureStatus('1H');
    expect(liveStatus.isLive).toBe(true);
    expect(liveStatus.badgeText).toBe('🟢 O‘yin bo‘lmoqda');
    expect(liveStatus.label).toBe('🟢 O‘yin bo‘lmoqda');
    expect(liveStatus.badgeClass).toContain('text-emerald-400');
  });

  it('maps half-time status code correctly', () => {
    const htStatus = mapFixtureStatus('HT');
    expect(htStatus.isLive).toBe(true);
    expect(htStatus.shortLabel).toBe('Tanaffus');
  });

  it('maps finished status code FT correctly', () => {
    const finishedStatus = mapFixtureStatus('FT');
    expect(finishedStatus.isFinished).toBe(true);
    expect(finishedStatus.badgeText).toBe('Tugadi');
  });

  it('maps scheduled status code NS correctly', () => {
    const scheduledStatus = mapFixtureStatus('NS');
    expect(scheduledStatus.isLive).toBe(false);
    expect(scheduledStatus.isFinished).toBe(false);
    expect(scheduledStatus.badgeText).toBe('Boshlanmagan');
  });

  it('maps postponed status code PST correctly', () => {
    const postponedStatus = mapFixtureStatus('PST');
    expect(postponedStatus.isPostponed).toBe(true);
    expect(postponedStatus.badgeText).toBe('Qoldirildi');
  });
});
