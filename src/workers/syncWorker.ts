import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES, type SyncJobData } from '../jobs/queues.js';
import { ApiFootballClient } from '../providers/api-football/client.js';
import { logger } from '../utils/logger.js';

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

let syncWorkerInstance: Worker<SyncJobData> | null = null;

export function createSyncWorker(): Worker<SyncJobData> {
  if (syncWorkerInstance) return syncWorkerInstance;

  const _apiClient = new ApiFootballClient();

  syncWorkerInstance = new Worker<SyncJobData>(
    QUEUE_NAMES.SYNC,
    async (job: Job<SyncJobData>) => {
      logger.info({ jobId: job.id, jobType: job.data.type }, 'Sync worker vazifani bajarmoqda');

      switch (job.data.type) {
        case 'SYNC_DAILY_FIXTURES': {
          const date = job.data.date || new Date().toISOString().split('T')[0]!;
          logger.info({ date }, 'Kunlik o‘yinlar API-Football orqali sinxronlashtiriladi (Worker)');
          // API-Football call is isolated here in the worker
          // await apiClient.getFixturesByDate(date);
          break;
        }
        case 'SYNC_COMPETITION': {
          logger.info({ compId: job.data.competitionId }, 'Turnir ma’lumotlari sinxronlanmoqda');
          break;
        }
        case 'SYNC_LIVE_MATCHES': {
          logger.info('Jonli o‘yinlar holati yangilanmoqda');
          break;
        }
        default:
          logger.warn({ data: job.data }, 'Noma’lum sync vazifasi');
      }

      return { success: true, processedAt: new Date().toISOString() };
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 2,
    },
  );

  syncWorkerInstance.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Sync worker vazifasi muvaffaqiyatli yakunlandi');
  });

  syncWorkerInstance.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err }, 'Sync worker vazifasida xatolik yuz berdi');
  });

  return syncWorkerInstance;
}

export async function stopSyncWorker(): Promise<void> {
  if (syncWorkerInstance) {
    await syncWorkerInstance.close();
    syncWorkerInstance = null;
  }
}
