import { pgTable, uuid, text, jsonb, timestamp, integer, numeric, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const agentActivations = pgTable('agent_activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  agent_type: text('agent_type').notNull(),
  trigger_type: text('trigger_type').notNull(),
  trigger_source: text('trigger_source'),
  trigger_event_id: uuid('trigger_event_id'),
  input_tokens: integer('input_tokens').notNull().default(0),
  output_tokens: integer('output_tokens').notNull().default(0),
  total_cost_usd: numeric('total_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  model_used: text('model_used'),
  steps: integer('steps').notNull().default(0),
  tool_calls: integer('tool_calls').notNull().default(0),
  specialist_invocations: integer('specialist_invocations').notNull().default(0),
  duration_ms: integer('duration_ms').notNull().default(0),
  status: text('status').notNull().default('completed'),
  error_message: text('error_message'),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('agent_activations_deal_idx').on(table.deal_id),
  agentTypeIdx: index('agent_activations_type_idx').on(table.agent_type),
  createdAtIdx: index('agent_activations_created_idx').on(table.created_at),
}));
