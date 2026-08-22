export const CACHE_PREFIX = 'football';

export const CacheKeys = {
  fixturesToday: () => `${CACHE_PREFIX}:fixtures:today`,
  fixturesByDate: (date: string) => `${CACHE_PREFIX}:fixtures:date:${date}`,
  fixtureDetails: (fixtureId: number | string) => `${CACHE_PREFIX}:fixtures:id:${fixtureId}`,
  competitionsList: () => `${CACHE_PREFIX}:competitions:list`,
  competitionDetails: (compId: number | string) => `${CACHE_PREFIX}:competitions:id:${compId}`,
  userFavoriteTeams: (userId: number | string) => `${CACHE_PREFIX}:user:${userId}:fav_teams`,
  userFavoriteCompetitions: (userId: number | string) =>
    `${CACHE_PREFIX}:user:${userId}:fav_competitions`,
  syncLock: (syncType: string) => `${CACHE_PREFIX}:lock:sync:${syncType}`,
};

export const CACHE_TTL = {
  FIXTURES_TODAY_SECONDS: 60, // 1 minute
  FIXTURES_FINISHED_SECONDS: 3600 * 24, // 24 hours for finalized games
  COMPETITIONS_SECONDS: 3600 * 12, // 12 hours
  FAVORITES_SECONDS: 600, // 10 minutes
};
