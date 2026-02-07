import { pgTable, uuid, text, jsonb, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { propagationEvents } from './propagation-events';
import { users } from './users';

export const actionChains = pgTable('action_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  trigger_event_id: uuid('trigger_event_id').references(() => propagationEvents.id),
  summary: text('summary').notNull(),
  significance: integer('significance').notNull().default(3),
  approval_tier: integer('approval_tier').notNull(),
  status: text('status').notNull().default('pending'),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  approved_by: uuid('approved_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const proposedActions = pgTable('proposed_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chain_id: uuid('chain_id').references(() => actionChains.id, { onDelete: 'cascade' }),
  sequence_order: integer('sequence_order').notNull(),
  depends_on: uuid('depends_on').array().default([]),
  action_type: text('action_type').notNull(),
  target_entity_type: text('target_entity_type'),
  target_entity_id: uuid('target_entity_id'),
  payload: jsonb('payload').notNull().default({}),
  preview: jsonb('preview').notNull().default({}),
  status: text('status').notNull().default('pending'),
  execution_result: jsonb('execution_result'),
  constitutional_violation: boolean('constitutional_violation').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  executed_at: timestamp('executed_at', { withTimezone: true }),
});
