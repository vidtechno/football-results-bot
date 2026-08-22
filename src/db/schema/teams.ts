import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  externalId: integer('external_id').notNull().unique(), // API-Football Team ID
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }),
  country: varchar('country', { length: 100 }),
  logoUrl: varchar('logo_url', { length: 500 }),
  venueName: varchar('venue_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
