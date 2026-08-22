export const BOT_BUTTONS = {
  TODAY_MATCHES: '⚽ Bugungi o‘yinlar',
  FAVORITES: '⭐ Sevimlilar',
  COMPETITIONS: '🏆 Turnirlar',
  CALENDAR: '📅 Taqvim',
  STATISTICS: '📊 Statistika',
  SETTINGS: '⚙️ Sozlamalar',
} as const;

export const MATCH_STATUS_LABELS = {
  LIVE: '🟢 O‘yin bo‘lmoqda',
  NOT_STARTED: '⏳ Boshlanmagan',
  FINISHED: '🏁 Yakunlandi',
  POSTPONED: '⏸ Qoldirildi',
  CANCELLED: '❌ Bekor qilindi',
} as const;

export interface MVPCompetitionSeed {
  externalId: number;
  name: string;
  country: string;
  code: string;
  type: 'league' | 'cup';
  logoUrl?: string;
}

export const MVP_COMPETITIONS: MVPCompetitionSeed[] = [
  {
    externalId: 352,
    name: 'O‘zbekiston Superligasi',
    country: 'Uzbekistan',
    code: 'UZB_SL',
    type: 'league',
  },
  {
    externalId: 39,
    name: 'Premier League',
    country: 'England',
    code: 'ENG_PL',
    type: 'league',
  },
  {
    externalId: 140,
    name: 'La Liga',
    country: 'Spain',
    code: 'ESP_LL',
    type: 'league',
  },
  {
    externalId: 135,
    name: 'Serie A',
    country: 'Italy',
    code: 'ITA_SA',
    type: 'league',
  },
  {
    externalId: 78,
    name: 'Bundesliga',
    country: 'Germany',
    code: 'GER_BL',
    type: 'league',
  },
  {
    externalId: 61,
    name: 'Ligue 1',
    country: 'France',
    code: 'FRA_L1',
    type: 'league',
  },
  {
    externalId: 2,
    name: 'UEFA Champions League',
    country: 'World',
    code: 'UEFA_CL',
    type: 'cup',
  },
  {
    externalId: 3,
    name: 'UEFA Europa League',
    country: 'World',
    code: 'UEFA_EL',
    type: 'cup',
  },
  {
    externalId: 848,
    name: 'UEFA Conference League',
    country: 'World',
    code: 'UEFA_ECL',
    type: 'cup',
  },
  {
    externalId: 307,
    name: 'Saudi Pro League',
    country: 'Saudi-Arabia',
    code: 'SAU_SPL',
    type: 'league',
  },
];
