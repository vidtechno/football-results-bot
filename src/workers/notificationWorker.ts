import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, type NotificationJobData } from '../jobs/queues.js';
import { logger } from '../utils/logger.js';
import type { Bot } from 'grammy';

function getRedisConnectionOptions() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null,
  };
}

let notificationWorkerInstance: Worker<NotificationJobData> | null = null;

export function createNotificationWorker(bot?: Bot): Worker<NotificationJobData> {
  if (notificationWorkerInstance) return notificationWorkerInstance;

  notificationWorkerInstance = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => {
      logger.info(
        { jobId: job.id, eventType: job.data.eventType, fixtureId: job.data.fixtureId },
        'Bildirishnoma yuborilmoqda',
      );

      const userIds = job.data.userIds || [];
      for (const userId of userIds) {
        try {
          if (bot) {
            await bot.api.sendMessage(userId, job.data.text, { parse_mode: 'HTML' });
          }
        } catch (error) {
          logger.error({ error, userId }, 'Foydalanuvchiga bildirishnoma yuborishda xatolik');
        }
      }

      return { deliveredCount: userIds.length };
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 5,
    },
  );

  notificationWorkerInstance.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Bildirishnomalar muvaffaqiyatli tarqatildi');
  });

  notificationWorkerInstance.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Bildirishnoma yuborishda xatolik');
  });

  return notificationWorkerInstance;
}

export async function stopNotificationWorker(): Promise<void> {
  if (notificationWorkerInstance) {
    await notificationWorkerInstance.close();
    notificationWorkerInstance = null;
  }
}
