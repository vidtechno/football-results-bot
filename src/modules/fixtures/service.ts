import { eq, gte, lte, and } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { fixtures, type Fixture } from '../../db/schema/fixtures.js';
import { teams, type Team } from '../../db/schema/teams.js';
import { competitions, type Competition } from '../../db/schema/competitions.js';
import { CacheKeys, CACHE_TTL } from '../../cache/keys.js';
import { getJsonCache, setJsonCache } from '../../cache/redis.js';
import { MATCH_STATUS_LABELS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

export interface PopulatedFixture extends Fixture {
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
}

export class FixtureService {
  /**
   * Retrieves today's fixtures using Cache-First pattern (Redis -> Supabase DB).
   * Ongoing games show '🟢 O‘yin bo‘lmoqda' without live polling.
   */
  static async getTodayFixtures(): Promise<PopulatedFixture[]> {
    const todayStr = new Date().toISOString().split('T')[0]!;
    const cacheKey = CacheKeys.fixturesByDate(todayStr);

    // 1. Try Redis cache first
    const cached = await getJsonCache<PopulatedFixture[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      logger.debug({ count: cached.length }, 'Bugungi o‘yinlar Redis keshidan yuklandi');
      return cached;
    }

    // 2. Fallback to Supabase Database
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const db = getDb();
    const rows = await db
      .select({
        fixture: fixtures,
        homeTeam: teams,
        competition: competitions,
      })
      .from(fixtures)
      .innerJoin(competitions, eq(fixtures.competitionId, competitions.id))
      .innerJoin(teams, eq(fixtures.homeTeamId, teams.id))
      .where(and(gte(fixtures.kickoffAt, startOfDay), lte(fixtures.kickoffAt, endOfDay)))
      .orderBy(fixtures.kickoffAt);

    // Fetch away teams
    const populated: PopulatedFixture[] = [];
    for (const row of rows) {
      const awayTeamRow = await db
        .select()
        .from(teams)
        .where(eq(teams.id, row.fixture.awayTeamId))
        .limit(1);

      if (awayTeamRow[0]) {
        populated.push({
          ...row.fixture,
          homeTeam: row.homeTeam,
          awayTeam: awayTeamRow[0],
          competition: row.competition,
        });
      }
    }

    // 3. Cache into Redis
    await setJsonCache(cacheKey, populated, CACHE_TTL.FIXTURES_TODAY_SECONDS);

    return populated;
  }

  /**
   * Formats fixture status according to product rules:
   * - LIVE: '🟢 O‘yin bo‘lmoqda'
   * - FT: '🏁 Yakunlandi: 2 - 1'
   * - NS: '⏳ Boshlanmagan: 21:45'
   */
  static formatFixtureStatusText(fixture: PopulatedFixture): string {
    const time = new Date(fixture.kickoffAt).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    });

    if (fixture.status === 'LIVE' || fixture.status === 'HT') {
      return MATCH_STATUS_LABELS.LIVE;
    }

    if (fixture.status === 'FT' || fixture.status === 'AET' || fixture.status === 'PEN') {
      const hScore = fixture.fullTimeHomeScore ?? fixture.homeScore ?? 0;
      const aScore = fixture.fullTimeAwayScore ?? fixture.awayScore ?? 0;
      return `${MATCH_STATUS_LABELS.FINISHED} (${hScore} - ${aScore})`;
    }

    if (fixture.status === 'PST') {
      return MATCH_STATUS_LABELS.POSTPONED;
    }

    if (fixture.status === 'CANC') {
      return MATCH_STATUS_LABELS.CANCELLED;
    }

    return `${MATCH_STATUS_LABELS.NOT_STARTED} (${time})`;
  }
}
