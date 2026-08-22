import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { competitions, type Competition } from '../../db/schema/competitions.js';
import { CacheKeys, CACHE_TTL } from '../../cache/keys.js';
import { getJsonCache, setJsonCache } from '../../cache/redis.js';
import { logger } from '../../utils/logger.js';

export class CompetitionService {
  /**
   * Reads all active competitions using Cache-First pattern (Redis -> Supabase DB).
   * Note: Bot never calls API-Football directly.
   */
  static async getActiveCompetitions(): Promise<Competition[]> {
    const cacheKey = CacheKeys.competitionsList();

    // 1. Try Redis cache first
    const cached = await getJsonCache<Competition[]>(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      logger.debug({ count: cached.length }, 'Turnirlar Redis keshidan yuklandi');
      return cached;
    }

    // 2. Fallback to Supabase Database
    logger.debug('Turnirlar keshda topilmadi, ma’lumotlar bazasidan o‘qilmoqda');
    const db = getDb();
    const dbCompetitions = await db
      .select()
      .from(competitions)
      .where(eq(competitions.isActive, true))
      .orderBy(competitions.displayOrder);

    // 3. Populate Redis cache
    if (dbCompetitions.length > 0) {
      await setJsonCache(cacheKey, dbCompetitions, CACHE_TTL.COMPETITIONS_SECONDS);
    }

    return dbCompetitions;
  }
}
