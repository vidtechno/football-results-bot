import { pgTable, serial, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const apiSyncState = pgTable('api_sync_state', {
  id: serial('id').primaryKey(),
  syncType: varchar('sync_type', { length: 100 }).notNull().unique(), // e.g. 'COMPETITIONS', 'FIXTURES_TODAY', 'LIVE_STATUS'
  status: varchar('status', { length: 50 }).notNull().default('IDLE'), // 'IDLE' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR'
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  nextSyncAt: timestamp('next_sync_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  errorMessage: varchar('error_message', { length: 1000 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ApiSyncState = typeof apiSyncState.$inferSelect;
export type NewApiSyncState = typeof apiSyncState.$inferInsert;
