import type { Context } from 'grammy';
import { CompetitionService } from '../../modules/competitions/service.js';
import { FixtureService } from '../../modules/fixtures/service.js';
import { logger } from '../../utils/logger.js';

export async function handleTodayMatches(ctx: Context) {
  try {
    await ctx.replyWithChatAction('typing');
    const fixtures = await FixtureService.getTodayFixtures();

    if (fixtures.length === 0) {
      await ctx.reply(
        '⚽ <b>Bugungi o‘yinlar</b>\n\n' +
          'Bugun asosiy turnirlarda rejalashtirilgan o‘yinlar topilmadi.\n' +
          'Barcha turnirlar ro‘yxatini ko‘rish uchun <b>🏆 Turnirlar</b> bo‘limiga o‘ting.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    let message = `⚽ <b>Bugungi o‘yinlar jadvali:</b>\n\n`;
    for (const item of fixtures) {
      const statusText = FixtureService.formatFixtureStatusText(item);
      message += `🏆 <b>${item.competition.name}</b>\n`;
      message += `⚔️ ${item.homeTeam.name} vs ${item.awayTeam.name}\n`;
      message += `📌 Holat: ${statusText}\n\n`;
    }

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error({ error }, 'Bugungi o‘yinlarni ko‘rsatishda xatolik');
    await ctx.reply(
      'O‘yinlar ma’lumotini yuklashda xatolik yuz berdi. Birozdan so‘ng urinib ko‘ring.',
    );
  }
}

export async function handleCompetitions(ctx: Context) {
  try {
    await ctx.replyWithChatAction('typing');
    const comps = await CompetitionService.getActiveCompetitions();

    if (comps.length === 0) {
      await ctx.reply(
        '🏆 <b>Faol turnirlar</b>\n\n' +
          'Hozirda turnirlar ro‘yxati yangilanmoqda. Iltimos, birozdan so‘ng tekshirib ko‘ring.',
        { parse_mode: 'HTML' },
      );
      return;
    }

    let message = '🏆 <b>Mavjud turnirlar va ligalar:</b>\n\n';
    comps.forEach((comp, idx) => {
      const typeLabel = comp.type === 'cup' ? 'Kubok' : 'Liga';
      message += `${idx + 1}. <b>${comp.name}</b> (${comp.country}) - <i>${typeLabel}</i>\n`;
    });

    message += '\n<i>Turnir bo‘yicha batafsil jadval va o‘yinlar tez orada qo‘shiladi.</i>';

    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    logger.error({ error }, 'Turnirlarni ko‘rsatishda xatolik');
    await ctx.reply('Turnirlar ro‘yxatini yuklashda xatolik yuz berdi.');
  }
}

export async function handleFavorites(ctx: Context) {
  await ctx.reply(
    '⭐ <b>Sevimlilar bo‘limi</b>\n\n' +
      'Siz o‘zingiz yoqtirgan jamoalar va chempionatlarni sevimli sifatida saqlab, faqat ularning o‘yin natijalarini kuzatishingiz mumkin.\n\n' +
      '<i>Tez kunda sevimli jamoalarni tanlash funksiyasi faollashtiriladi.</i>',
    { parse_mode: 'HTML' },
  );
}

export async function handleCalendar(ctx: Context) {
  const today = new Date().toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Tashkent',
  });

  await ctx.reply(
    `📅 <b>O‘yinlar taqvimi</b>\n\n` +
      `Bugungi sana: <b>${today}</b>\n\n` +
      `Taqvim orqali siz kelgusi kunlar hamda o‘tgan turlar natijalarini sanalar bo‘yicha ko‘rishingiz mumkin bo‘ladi.`,
    { parse_mode: 'HTML' },
  );
}

export async function handleStatistics(ctx: Context) {
  await ctx.reply(
    '📊 <b>Futbol statistikasi</b>\n\n' +
      'Ushbu bo‘limda:\n' +
      '• 🥇 Turnir jadvali va ochkolar\n' +
      '• 🎯 To‘purarlar (Bombardirlar) ro‘yxati\n' +
      '• 🅰️ Assist ustalari\n\n' +
      '<i>Yakunlangan o‘yinlar bo‘yicha statistika tez orada yangilanadi.</i>',
    { parse_mode: 'HTML' },
  );
}

export async function handleSettings(ctx: Context) {
  await ctx.reply(
    '⚙️ <b>Sozlamalar</b>\n\n' +
      '🔔 <b>Bildirishnomalar:</b>\n' +
      '• O‘yin boshlanishi: <b>Yoqilgan ✅</b>\n' +
      '• Gollarni yuborish: <b>Yoqilgan ✅</b>\n' +
      '• Yakuniy hisob: <b>Yoqilgan ✅</b>\n\n' +
      '🌐 Til: <b>O‘zbekcha (Lotin)</b>',
    { parse_mode: 'HTML' },
  );
}
