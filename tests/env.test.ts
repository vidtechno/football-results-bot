import { describe, it, expect } from 'vitest';
import { envSchema } from '../src/config/env.js';

describe('Environment Validation (envSchema)', () => {
  it('should validate valid environment configuration', () => {
    const validConfig = {
      NODE_ENV: 'test',
      PORT: '3000',
      BOT_TOKEN: '123456789:ABCdefGhIJKlmNoPQRstuVWXyz',
      DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/postgres',
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: '6379',
      API_FOOTBALL_KEY: 'test_api_key',
    };

    const result = envSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe('test');
      expect(result.data.BOT_TOKEN).toBe('123456789:ABCdefGhIJKlmNoPQRstuVWXyz');
    }
  });

  it('should fail when BOT_TOKEN is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/postgres',
      API_FOOTBALL_KEY: 'test_api_key',
    };

    const result = envSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should fail when DATABASE_URL is not a valid URL', () => {
    const invalidConfig = {
      BOT_TOKEN: '123456789:ABCdef',
      DATABASE_URL: 'invalid-url',
      API_FOOTBALL_KEY: 'test_api_key',
    };

    const result = envSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
