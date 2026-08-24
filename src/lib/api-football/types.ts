import { z } from 'zod';

export const ApiFootballFixtureSchema = z.object({
  fixture: z.object({
    id: z.number(),
    referee: z.string().nullable().optional(),
    timezone: z.string().optional(),
    date: z.string(),
    timestamp: z.number().optional(),
    status: z.object({
      long: z.string().optional(),
      short: z.string().optional(),
      elapsed: z.number().nullable().optional(),
    }),
    venue: z.object({
      id: z.number().nullable().optional(),
      name: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
    }).optional(),
  }),
  league: z.object({
    id: z.number(),
    name: z.string(),
    country: z.string().optional(),
    logo: z.string().optional(),
    flag: z.string().nullable().optional(),
    season: z.number().optional(),
    round: z.string().optional(),
  }),
  teams: z.object({
    home: z.object({
      id: z.number(),
      name: z.string(),
      logo: z.string().optional(),
      winner: z.boolean().nullable().optional(),
    }),
    away: z.object({
      id: z.number(),
      name: z.string(),
      logo: z.string().optional(),
      winner: z.boolean().nullable().optional(),
    }),
  }),
  goals: z.object({
    home: z.number().nullable().optional(),
    away: z.number().nullable().optional(),
  }),
  score: z.object({
    halftime: z.object({ home: z.number().nullable().optional(), away: z.number().nullable().optional() }).optional(),
    fulltime: z.object({ home: z.number().nullable().optional(), away: z.number().nullable().optional() }).optional(),
    extratime: z.object({ home: z.number().nullable().optional(), away: z.number().nullable().optional() }).optional(),
    penalty: z.object({ home: z.number().nullable().optional(), away: z.number().nullable().optional() }).optional(),
  }).optional(),
});

export const ApiFootballResponseSchema = z.object({
  get: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  errors: z.union([z.array(z.any()), z.record(z.any())]).optional(),
  results: z.number().optional(),
  paging: z.object({ current: z.number().optional(), total: z.number().optional() }).optional(),
  response: z.array(ApiFootballFixtureSchema),
});

export type ApiFootballFixture = z.infer<typeof ApiFootballFixtureSchema>;
export type ApiFootballResponse = z.infer<typeof ApiFootballResponseSchema>;

export const StandingRowSchema = z.object({
  rank: z.number(),
  team: z.object({
    id: z.number(),
    name: z.string(),
    logo: z.string().optional(),
  }),
  points: z.number(),
  goalsDiff: z.number().optional(),
  group: z.string().optional(),
  form: z.string().optional(),
  status: z.string().optional(),
  description: z.string().nullable().optional(),
  all: z.object({
    played: z.number(),
    win: z.number(),
    draw: z.number(),
    lose: z.number(),
    goals: z.object({
      for: z.number(),
      against: z.number(),
    }),
  }),
});

export type StandingRow = z.infer<typeof StandingRowSchema>;
