import { pgTable, serial, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { teams } from './teams.js';
import { competitions } from './competitions.js';

export const favoriteTeams = pgTable(
  'favorite_teams',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('idx_favorite_teams_user_team').on(table.userId, table.teamId)],
);

export const favoriteCompetitions = pgTable(
  'favorite_competitions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    competitionId: integer('competition_id')
      .notNull()
      .references(() => competitions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_favorite_competitions_user_comp').on(table.userId, table.competitionId),
  ],
);

export type FavoriteTeam = typeof favoriteTeams.$inferSelect;
export type NewFavoriteTeam = typeof favoriteTeams.$inferInsert;
export type FavoriteCompetition = typeof favoriteCompetitions.$inferSelect;
export type NewFavoriteCompetition = typeof favoriteCompetitions.$inferInsert;
