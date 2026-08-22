import { describe, it, expect } from 'vitest';
import { getMainReplyKeyboard } from '../src/bot/keyboards.js';
import { BOT_BUTTONS } from '../src/utils/constants.js';

describe('Bot Keyboards & Uzbek Texts', () => {
  function getButtonText(btn: unknown): string {
    if (typeof btn === 'string') return btn;
    if (btn && typeof btn === 'object' && 'text' in btn) {
      return String((btn as { text: unknown }).text);
    }
    return '';
  }

  it('should generate the main reply keyboard with all 6 buttons in 3 rows', () => {
    const keyboard = getMainReplyKeyboard();
    const rows = keyboard.build();

    expect(rows.length).toBe(3);

    // Row 1: Today matches, Favorites
    expect(getButtonText(rows[0]?.[0])).toBe(BOT_BUTTONS.TODAY_MATCHES);
    expect(getButtonText(rows[0]?.[1])).toBe(BOT_BUTTONS.FAVORITES);

    // Row 2: Competitions, Calendar
    expect(getButtonText(rows[1]?.[0])).toBe(BOT_BUTTONS.COMPETITIONS);
    expect(getButtonText(rows[1]?.[1])).toBe(BOT_BUTTONS.CALENDAR);

    // Row 3: Statistics, Settings
    expect(getButtonText(rows[2]?.[0])).toBe(BOT_BUTTONS.STATISTICS);
    expect(getButtonText(rows[2]?.[1])).toBe(BOT_BUTTONS.SETTINGS);
  });

  it('should have exact Uzbek Latin button labels', () => {
    expect(BOT_BUTTONS.TODAY_MATCHES).toBe('⚽ Bugungi o‘yinlar');
    expect(BOT_BUTTONS.FAVORITES).toBe('⭐ Sevimlilar');
    expect(BOT_BUTTONS.COMPETITIONS).toBe('🏆 Turnirlar');
    expect(BOT_BUTTONS.CALENDAR).toBe('📅 Taqvim');
    expect(BOT_BUTTONS.STATISTICS).toBe('📊 Statistika');
    expect(BOT_BUTTONS.SETTINGS).toBe('⚙️ Sozlamalar');
  });
});
