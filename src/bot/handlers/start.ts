import type { Context } from 'grammy';
import { getMainReplyKeyboard } from '../keyboards.js';
import { UserService } from '../../modules/users/service.js';
import { logger } from '../../utils/logger.js';

export async function handleStartCommand(ctx: Context) {
  try {
    if (ctx.from) {
      await UserService.upsertUser(ctx.from);
    }

    const name = ctx.from?.first_name || 'Hurmatli muxlis';

    const welcomeMessage =
      `⚽ <b>Assalomu alaykum, ${name}!</b>\n\n` +
      `Futbol natijalari botiga xush kelibsiz.\n\n` +
      `Ushbu bot orqali siz:\n` +
      `• ⚽ Bugungi o‘yinlar va yakunlangan hisoblar\n` +
      `• 🏆 O‘zbekiston Superligasi va Yevropaning top-5 ligalari\n` +
      `• ⭐ Sevimli jamoa va turnirlarni kuzatib borish\n` +
      `• 📅 O‘yinlar taqvimi va statistikalar bilan tanishishingiz mumkin.\n\n` +
      `<i>Quyidagi menyu orqali kerakli bo‘limni tanlang:</i>`;

    await ctx.reply(welcomeMessage, {
      parse_mode: 'HTML',
      reply_markup: getMainReplyKeyboard(),
    });
  } catch (error) {
    logger.error({ error, from: ctx.from }, '/start komandasi bajarilishida xatolik');
    await ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.');
  }
}
