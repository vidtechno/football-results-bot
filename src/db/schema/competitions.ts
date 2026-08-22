import { pgTable, serial, integer, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const competitions = pgTable('competitions', {
  id: serial('id').primaryKey(),
  externalId: integer('external_id').notNull().unique(), // API-Football League ID
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  country: varchar('country', { length: 100 }).notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  type: varchar('type', { length: 20 }).default('league').notNull(), // 'league' | 'cup'
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Competition = typeof competitions.$inferSelect;
export type NewCompetition = typeof competitions.$inferInsert;
