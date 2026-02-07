import { pgTable, uuid, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { users } from './users';

export const approvalPolicies = pgTable('approval_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  scope_type: text('scope_type').notNull().default('default'), // 'default' | 'role' | 'user' | 'deal'
  scope_id: uuid('scope_id'), // references deal or user depending on scope_type
  rules: jsonb('rules').notNull().default([]),
  is_active: boolean('is_active').default(true),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
