import { pgTable, uuid, text, jsonb, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const negotiationPositions = pgTable('negotiation_positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  provision_type: text('provision_type').notNull(),
  provision_label: text('provision_label').notNull(),
  our_current_position: text('our_current_position'),
  their_current_position: text('their_current_position'),
  our_opening_position: text('our_opening_position'),
  their_opening_position: text('their_opening_position'),
  agreed_position: text('agreed_position'),
  position_history: jsonb('position_history').default([]),
  status: text('status').notNull().default('open'),
  significance: integer('significance').notNull().default(3),
  financial_impact: boolean('financial_impact').notNull().default(false),
  category: text('category'),
  notes: text('notes'),
  last_updated_from: text('last_updated_from'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('negotiation_positions_deal_idx').on(table.deal_id),
  statusIdx: index('negotiation_positions_status_idx').on(table.status),
  provisionIdx: index('negotiation_positions_provision_idx').on(table.provision_type),
}));

export const negotiationRoadmaps = pgTable('negotiation_roadmaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  strategy_summary: text('strategy_summary'),
  key_leverage_points: jsonb('key_leverage_points').default([]),
  concession_priorities: jsonb('concession_priorities').default([]),
  red_lines: jsonb('red_lines').default([]),
  fallback_positions: jsonb('fallback_positions').default({}),
  generated_by: text('generated_by').default('system'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('negotiation_roadmaps_deal_idx').on(table.deal_id),
}));
