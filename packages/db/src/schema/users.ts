import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('attorney'),
  firm: text('firm'),
  microsoft_access_token: text('microsoft_access_token'),
  microsoft_refresh_token: text('microsoft_refresh_token'),
  preferences: jsonb('preferences').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
