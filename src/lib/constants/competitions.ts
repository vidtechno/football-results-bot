export interface CompetitionMeta {
  providerId: number;
  slug: string;
  nameUz: string;
  nameOriginal: string;
  country: string;
  countryUz: string;
  flag: string;
  logoUrl: string;
  code: string;
}

export const TARGET_COMPETITIONS: CompetitionMeta[] = [
  {
    providerId: 362,
    slug: 'uzbekistan-superleague',
    nameUz: 'O‘zbekiston Superligasi',
    nameOriginal: 'Super League',
    country: 'Uzbekistan',
    countryUz: 'O‘zbekiston',
    flag: '🇺🇿',
    logoUrl: 'https://media.api-sports.io/football/leagues/362.png',
    code: 'USL',
  },
  {
    providerId: 39,
    slug: 'premier-league',
    nameUz: 'Angliya Premyer-Ligasi',
    nameOriginal: 'Premier League',
    country: 'England',
    countryUz: 'Angliya',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logoUrl: 'https://media.api-sports.io/football/leagues/39.png',
    code: 'EPL',
  },
  {
    providerId: 140,
    slug: 'la-liga',
    nameUz: 'Ispaniya La Ligasi',
    nameOriginal: 'La Liga',
    country: 'Spain',
    countryUz: 'Ispaniya',
    flag: '🇪🇸',
    logoUrl: 'https://media.api-sports.io/football/leagues/140.png',
    code: 'PD',
  },
  {
    providerId: 135,
    slug: 'serie-a',
    nameUz: 'Italiya Serie A-si',
    nameOriginal: 'Serie A',
    country: 'Italy',
    countryUz: 'Italiya',
    flag: '🇮🇹',
    logoUrl: 'https://media.api-sports.io/football/leagues/135.png',
    code: 'SA',
  },
  {
    providerId: 78,
    slug: 'bundesliga',
    nameUz: 'Germaniya Bundesligasi',
    nameOriginal: 'Bundesliga',
    country: 'Germany',
    countryUz: 'Germaniya',
    flag: '🇩🇪',
    logoUrl: 'https://media.api-sports.io/football/leagues/78.png',
    code: 'BL1',
  },
  {
    providerId: 61,
    slug: 'ligue-1',
    nameUz: 'Fransiya Ligue 1-i',
    nameOriginal: 'Ligue 1',
    country: 'France',
    countryUz: 'Fransiya',
    flag: '🇫🇷',
    logoUrl: 'https://media.api-sports.io/football/leagues/61.png',
    code: 'FL1',
  },
  {
    providerId: 2,
    slug: 'champions-league',
    nameUz: 'UEFA Chempionlar Ligasi',
    nameOriginal: 'UEFA Champions League',
    country: 'World',
    countryUz: 'Yevropa',
    flag: '🇪🇺',
    logoUrl: 'https://media.api-sports.io/football/leagues/2.png',
    code: 'CL',
  },
  {
    providerId: 3,
    slug: 'europa-league',
    nameUz: 'UEFA Yevropa Ligasi',
    nameOriginal: 'UEFA Europa League',
    country: 'World',
    countryUz: 'Yevropa',
    flag: '🇪🇺',
    logoUrl: 'https://media.api-sports.io/football/leagues/3.png',
    code: 'EL',
  },
  {
    providerId: 848,
    slug: 'conference-league',
    nameUz: 'UEFA Konferensiyalar Ligasi',
    nameOriginal: 'UEFA Conference League',
    country: 'World',
    countryUz: 'Yevropa',
    flag: '🇪🇺',
    logoUrl: 'https://media.api-sports.io/football/leagues/848.png',
    code: 'UECL',
  },
  {
    providerId: 307,
    slug: 'saudi-pro-league',
    nameUz: 'Saudiya Pro-Ligasi',
    nameOriginal: 'Saudi Pro League',
    country: 'Saudi-Arabia',
    countryUz: 'Saudiya Arabistoni',
    flag: '🇸🇦',
    logoUrl: 'https://media.api-sports.io/football/leagues/307.png',
    code: 'SPL',
  },
];

export function getCompetitionMetaBySlug(slug: string): CompetitionMeta | undefined {
  return TARGET_COMPETITIONS.find((c) => c.slug === slug);
}

export function getCompetitionMetaById(id: number): CompetitionMeta | undefined {
  return TARGET_COMPETITIONS.find((c) => c.providerId === id);
}
