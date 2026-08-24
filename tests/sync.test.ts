import { describe, it, expect } from 'vitest';
import { ApiFootballFixtureSchema, ApiFootballResponseSchema } from '../src/lib/api-football/types';
import { TARGET_COMPETITIONS } from '../src/lib/constants/competitions';

describe('API-Football Validation & Competitions Config', () => {
  it('validates target competitions catalog contains 10 items including Uzbekistan Superleague and Saudi Pro League', () => {
    expect(TARGET_COMPETITIONS).toHaveLength(10);
    
    const uzb = TARGET_COMPETITIONS.find((c) => c.slug === 'uzbekistan-superleague');
    expect(uzb).toBeDefined();
    expect(uzb?.providerId).toBe(362);

    const saudi = TARGET_COMPETITIONS.find((c) => c.slug === 'saudi-pro-league');
    expect(saudi).toBeDefined();
    expect(saudi?.providerId).toBe(307);

    const fifa = TARGET_COMPETITIONS.find((c) => c.slug.includes('world-cup'));
    expect(fifa).toBeUndefined();
  });

  it('validates API-Football fixture payload schema with Zod', () => {
    const mockPayload = {
      fixture: {
        id: 1001,
        date: '2026-08-25T18:00:00+00:00',
        status: {
          short: '1H',
          elapsed: 25,
        },
        venue: {
          name: 'Pakhtakor Central Stadium',
        },
      },
      league: {
        id: 362,
        name: 'Super League',
        country: 'Uzbekistan',
        round: 'Regular Season - 18',
      },
      teams: {
        home: { id: 50, name: 'Pakhtakor' },
        away: { id: 51, name: 'Navbahor' },
      },
      goals: {
        home: 1,
        away: 0,
      },
    };

    const parsed = ApiFootballFixtureSchema.safeParse(mockPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fixture.id).toBe(1001);
      expect(parsed.data.teams.home.name).toBe('Pakhtakor');
    }
  });

  it('validates full API-Football response container schema', () => {
    const mockResponse = {
      get: 'fixtures',
      results: 1,
      response: [
        {
          fixture: {
            id: 2002,
            date: '2026-08-25T20:00:00+00:00',
            status: { short: 'FT' },
          },
          league: {
            id: 39,
            name: 'Premier League',
          },
          teams: {
            home: { id: 33, name: 'Manchester United' },
            away: { id: 34, name: 'Newcastle' },
          },
          goals: { home: 2, away: 1 },
        },
      ],
    };

    const parsed = ApiFootballResponseSchema.safeParse(mockResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.response).toHaveLength(1);
    }
  });
});
