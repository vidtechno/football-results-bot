import { Keyboard } from 'grammy';
import { BOT_BUTTONS } from '../utils/constants.js';

/**
 * Creates the permanent main Uzbek reply keyboard:
 * [⚽ Bugungi o‘yinlar] [⭐ Sevimlilar]
 * [🏆 Turnirlar]        [📅 Taqvim]
 * [📊 Statistika]       [⚙️ Sozlamalar]
 */
export function getMainReplyKeyboard(): Keyboard {
  return new Keyboard()
    .text(BOT_BUTTONS.TODAY_MATCHES)
    .text(BOT_BUTTONS.FAVORITES)
    .row()
    .text(BOT_BUTTONS.COMPETITIONS)
    .text(BOT_BUTTONS.CALENDAR)
    .row()
    .text(BOT_BUTTONS.STATISTICS)
    .text(BOT_BUTTONS.SETTINGS)
    .resized()
    .persistent();
}
