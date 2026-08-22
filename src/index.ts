import { getEnv } from './config/env.js';
import { createBot } from './bot/index.js';
import { startServer } from './server.js';
import { closeDb } from './db/index.js';
import { closeRedis } from './cache/redis.js';
import { closeQueues } from './jobs/queues.js';
import { stopSyncWorker } from './workers/syncWorker.js';
import { stopNotificationWorker } from './workers/notificationWorker.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  logger.info('Futbol natijalari boti ishga tushirilmoqda...');

  // 1. Validate Environment Variables
  const env = getEnv();

  // 2. Start Fastify Health Check Server
  const server = await startServer(env.PORT, env.HOST);

  // 3. Initialize Telegram Bot
  const bot = createBot(env.BOT_TOKEN);

  // 4. Start Bot polling (or webhook)
  bot.start({
    onStart: (botInfo) => {
      logger.info(`🤖 Telegram bot ishga tushdi: @${botInfo.username}`);
    },
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Qabul qilingan signal: ${signal}. Tizim to‘xtatilmoqda...`);

    try {
      await bot.stop();
      await server.close();
      await stopSyncWorker();
      await stopNotificationWorker();
      await closeQueues();
      await closeRedis();
      await closeDb();
      logger.info('Barcha ulanishlar to‘xtatildi. Dastur muvaffaqiyatli yakunlandi.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Dasturni to‘xtatishda xatolik yuz berdi');
      process.exit(1);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.fatal({ error }, 'Dasturni ishga tushirishda kutilmagan xatolik');
  process.exit(1);
});
