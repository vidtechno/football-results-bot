import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error('DATABASE_URL topilmadi. Migratsiyani bajarish uchun DATABASE_URL kerak.');
    process.exit(1);
  }

  logger.info('Migratsiya boshlanmoqda...');
  const migrationClient = postgres(databaseUrl, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('✅ Barcha migratsiyalar muvaffaqiyatli bajarildi!');
  } catch (error) {
    logger.error({ error }, '❌ Migratsiya paytida xatolik yuz berdi');
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
