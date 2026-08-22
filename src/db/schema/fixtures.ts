import { pgTable, serial, integer, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { competitions } from './competitions.js';
import { teams } from './teams.js';

export const fixtures = pgTable(
  'fixtures',
  {
    id: serial('id').primaryKey(),
    externalId: integer('external_id').notNull().unique(), // API-Football Fixture ID
    competitionId: integer('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    season: integer('season').notNull(),
    round: varchar('round', { length: 100 }),
    homeTeamId: integer('home_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    awayTeamId: integer('away_team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('NS'), // 'NS' | 'LIVE' | 'FT' | 'HT' | 'PST' | 'CANC'
    statusShort: varchar('status_short', { length: 10 }).notNull().default('NS'),
    kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    halfTimeHomeScore: integer('half_time_home_score'),
    halfTimeAwayScore: integer('half_time_away_score'),
    fullTimeHomeScore: integer('full_time_home_score'),
    fullTimeAwayScore: integer('full_time_away_score'),
    venue: varchar('venue', { length: 255 }),
    referee: varchar('referee', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_fixtures_kickoff').on(table.kickoffAt),
    index('idx_fixtures_competition').on(table.competitionId),
    index('idx_fixtures_status').on(table.status),
  ],
);

export type Fixture = typeof fixtures.$inferSelect;
export type NewFixture = typeof fixtures.$inferInsert;
