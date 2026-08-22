import { Bot } from 'grammy';
import { handleStartCommand } from './handlers/start.js';
import {
  handleTodayMatches,
  handleCompetitions,
  handleFavorites,
  handleCalendar,
  handleStatistics,
  handleSettings,
} from './handlers/menu.js';
import { BOT_BUTTONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

let botInstance: Bot | null = null;

export function createBot(token?: string): Bot {
  if (botInstance) return botInstance;

  const botToken = token || process.env.BOT_TOKEN;
  if (!botToken) {
    throw new Error('BOT_TOKEN muhit o‘zgaruvchisi topilmadi (BOT_TOKEN is missing)');
  }

  const bot = new Bot(botToken);

  // Logging & Error handling middleware
  bot.use(async (ctx, next) => {
    logger.debug(
      { updateId: ctx.update.update_id, from: ctx.from?.id },
      'Telegram yangilanishi qabul qilindi',
    );
    await next();
  });

  bot.catch((err) => {
    logger.error({ error: err.error, ctx: err.ctx?.update }, 'GrammY botida xatolik yuz berdi');
  });

  // Commands
  bot.command('start', handleStartCommand);

  // Menu button listeners
  bot.hears(BOT_BUTTONS.TODAY_MATCHES, handleTodayMatches);
  bot.hears(BOT_BUTTONS.FAVORITES, handleFavorites);
  bot.hears(BOT_BUTTONS.COMPETITIONS, handleCompetitions);
  bot.hears(BOT_BUTTONS.CALENDAR, handleCalendar);
  bot.hears(BOT_BUTTONS.STATISTICS, handleStatistics);
  bot.hears(BOT_BUTTONS.SETTINGS, handleSettings);

  botInstance = bot;
  return bot;
}

export function getBot(): Bot | null {
  return botInstance;
}
