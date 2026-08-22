import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT) || 6379;
  const password = process.env.REDIS_PASSWORD || undefined;

  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  } else {
    redisClient = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis mijozida xatolik (Redis Client Error)');
  });

  return redisClient;
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const client = getRedis();
    if (client.status !== 'ready') {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.warn({ error }, 'Redis sog‘liq tekshiruvi muvaffaqiyatsiz (Health check failed)');
    return false;
  }
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.warn({ error, key }, 'Redis keshni o‘qishda xatolik yuz berdi');
    return null;
  }
}

export async function setJsonCache(
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  try {
    const client = getRedis();
    const stringified = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, stringified, 'EX', ttlSeconds);
    } else {
      await client.set(key, stringified);
    }
  } catch (error) {
    logger.warn({ error, key }, 'Redis keshga yozishda xatolik yuz berdi');
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedis();
    await client.del(key);
  } catch (error) {
    logger.warn({ error, key }, 'Redis keshni tozalashda xatolik yuz berdi');
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
