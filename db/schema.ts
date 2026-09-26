// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const cases = sqliteTable('cases', { id:text('id').primaryKey(), record:text('record').notNull(), createdAt:text('created_at').notNull() });
export const rateLimits = sqliteTable('rate_limits', { key:text('key').primaryKey(), count:integer('count').notNull(), expires:integer('expires').notNull() });
export const snapshots = sqliteTable('evidence_snapshots',{id:text('id').primaryKey(),input:text('input').notNull(),evidence:text('evidence').notNull(),createdAt:integer('created_at').notNull()});
