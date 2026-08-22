import { getDb, closeDb } from './index.js';
import { competitions } from './schema/competitions.js';
import { MVP_COMPETITIONS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export async function seedCompetitions() {
  const db = getDb();
  logger.info('MVP Turnirlarni ma’lumotlar bazasiga kiritish (seed) boshlandi...');

  for (let i = 0; i < MVP_COMPETITIONS.length; i++) {
    const comp = MVP_COMPETITIONS[i]!;
    await db
      .insert(competitions)
      .values({
        externalId: comp.externalId,
        name: comp.name,
        code: comp.code,
        country: comp.country,
        type: comp.type,
        isActive: true,
        displayOrder: i + 1,
      })
      .onConflictDoUpdate({
        target: competitions.externalId,
        set: {
          name: comp.name,
          code: comp.code,
          country: comp.country,
          type: comp.type,
          displayOrder: i + 1,
          updatedAt: new Date(),
        },
      });

    logger.info(`Turnir saqlandi/yangilandi: ${comp.name} (External ID: ${comp.externalId})`);
  }

  logger.info('✅ 10 ta asosiy MVP turnir muvaffaqiyatli saqlandi!');
}

async function main() {
  try {
    await seedCompetitions();
  } catch (error) {
    logger.error({ error }, '❌ Seed jarayonida xatolik yuz berdi');
    process.exit(1);
  } finally {
    await closeDb();
  }
}

if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  main();
}
