import { logger } from '../../utils/logger.js';
import type {
  ApiFootballResponse,
  ApiFootballLeagueItem,
  ApiFootballFixtureItem,
} from './types.js';

export class ApiFootballClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.API_FOOTBALL_KEY || '';
    this.baseUrl =
      baseUrl || process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
  ): Promise<ApiFootballResponse<T>> {
    if (!this.apiKey) {
      throw new Error('API_FOOTBALL_KEY belgilanmagan (API key missing)');
    }

    const url = new URL(`${this.baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, val]) => {
      url.searchParams.append(key, String(val));
    });

    logger.debug({ url: url.toString() }, 'API-Football so‘rovi yuborilmoqda');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-apisports-key': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, body: errorText },
        'API-Football so‘rovi xatolik bilan tugadi',
      );
      throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as ApiFootballResponse<T>;
  }

  // Placeholder methods for future sync worker execution
  async getLeagues(
    params: { id?: number; current?: string } = {},
  ): Promise<ApiFootballResponse<ApiFootballLeagueItem>> {
    return this.request<ApiFootballLeagueItem>('leagues', params);
  }

  async getFixturesByDate(date: string): Promise<ApiFootballResponse<ApiFootballFixtureItem>> {
    return this.request<ApiFootballFixtureItem>('fixtures', { date });
  }

  async getFixturesByLeague(
    leagueId: number,
    season: number,
  ): Promise<ApiFootballResponse<ApiFootballFixtureItem>> {
    return this.request<ApiFootballFixtureItem>('fixtures', { league: leagueId, season });
  }
}
