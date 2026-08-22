import { Queue } from 'bullmq';
import { logger } from '../utils/logger.js';

export const QUEUE_NAMES = {
  SYNC: 'api-football-sync-queue',
  NOTIFICATIONS: 'notification-delivery-queue',
} as const;

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

export interface SyncJobData {
  type: 'SYNC_DAILY_FIXTURES' | 'SYNC_COMPETITION' | 'SYNC_LIVE_MATCHES';
  date?: string;
  competitionId?: number;
  season?: number;
}

export interface NotificationJobData {
  eventId: number;
  fixtureId: number;
  eventType: 'MATCH_START' | 'GOAL' | 'MATCH_END';
  userIds?: number[];
  text: string;
}

let syncQueue: Queue<SyncJobData> | null = null;
let notificationQueue: Queue<NotificationJobData> | null = null;

export function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueue) {
    syncQueue = new Queue(QUEUE_NAMES.SYNC, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
    logger.info(`BullMQ ${QUEUE_NAMES.SYNC} navbati ishga tushirildi`);
  }
  return syncQueue;
}

export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });
    logger.info(`BullMQ ${QUEUE_NAMES.NOTIFICATIONS} navbati ishga tushirildi`);
  }
  return notificationQueue;
}

export async function closeQueues(): Promise<void> {
  if (syncQueue) {
    await syncQueue.close();
    syncQueue = null;
  }
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
}
