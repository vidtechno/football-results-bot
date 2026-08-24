import { ApiFootballResponseSchema, ApiFootballFixture } from './types';

const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const API_KEY = process.env.API_FOOTBALL_KEY || '';

export interface FetchFixturesParams {
  date?: string; // YYYY-MM-DD
  league?: number;
  season?: number;
}

/**
 * Server-only API-Football Client
 */
export async function fetchFixturesFromApi(params: FetchFixturesParams): Promise<ApiFootballFixture[]> {
  if (!API_KEY) {
    console.warn('[API-Football] API_FOOTBALL_KEY is not set. Returning empty list.');
    return [];
  }

  const url = new URL(`${BASE_URL}/fixtures`);
  if (params.date) url.searchParams.append('date', params.date);
  if (params.league) url.searchParams.append('league', String(params.league));
  if (params.season) url.searchParams.append('season', String(params.season));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-apisports-key': API_KEY,
    },
    next: { revalidate: 300 }, // Server revalidation cache
  });

  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }

  const rateLimitRemaining = response.headers.get('x-ratelimit-requests-remaining');
  if (rateLimitRemaining) {
    console.log(`[API-Football] Rate limit remaining: ${rateLimitRemaining}`);
  }

  const rawJson = await response.json();
  const parsed = ApiFootballResponseSchema.safeParse(rawJson);

  if (!parsed.success) {
    console.error('[API-Football] Zod Validation Error:', parsed.error);
    if (Array.isArray(rawJson.response)) {
      return rawJson.response as ApiFootballFixture[];
    }
    return [];
  }

  return parsed.data.response;
}
