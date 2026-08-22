import Fastify, { type FastifyInstance } from 'fastify';
import { checkDbConnection } from './db/index.js';
import { checkRedisConnection } from './cache/redis.js';
import { getBot } from './bot/index.js';
import { logger } from './utils/logger.js';

export function createServer(): FastifyInstance {
  const app = Fastify({
    logger: false, // Use our structured Pino logger
  });

  // Health check endpoint
  app.get('/health', async (_request, reply) => {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDbConnection(),
      checkRedisConnection(),
    ]);

    const isBotInitialized = getBot() !== null;
    const isHealthy = dbHealthy && redisHealthy;

    const statusCode = isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'football-results-bot',
      components: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
        bot: isBotInitialized ? 'initialized' : 'not_started',
      },
    });
  });

  return app;
}

export async function startServer(port = 3000, host = '0.0.0.0'): Promise<FastifyInstance> {
  const app = createServer();
  try {
    await app.listen({ port, host });
    logger.info(`🚀 Fastify server ishga tushdi: http://${host}:${port}/health`);
    return app;
  } catch (err) {
    logger.error({ err }, 'Serverni ishga tushirishda xatolik yuz berdi');
    throw err;
  }
}
