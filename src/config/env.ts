import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Telegram Bot
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required for Telegram bot execution'),

  // Supabase PostgreSQL
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),

  // Redis & BullMQ
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // API-Football
  API_FOOTBALL_KEY: z.string().min(1, 'API_FOOTBALL_KEY is required for sync worker'),
  API_FOOTBALL_BASE_URL: z.string().url().default('https://v3.football.api-sports.io'),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.format();
    const errorDetails = Object.entries(formattedErrors)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => `  - ${key}: ${(value as { _errors?: string[] })._errors?.join(', ')}`)
      .join('\n');

    throw new Error(
      `❌ Noto‘g‘ri muhit o‘zgaruvchilari (Environment validation failed):\n${errorDetails}`,
    );
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export function validateEnv(customEnv?: Record<string, unknown>): Env {
  return envSchema.parse(customEnv ?? process.env);
}
