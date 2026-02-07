import { pgTable, uuid, text, jsonb, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';
import { deals } from './deals';

/**
 * Deal Intelligence — shared context store for inter-agent communication
 */
export const dealIntelligence = pgTable('deal_intelligence', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id).notNull(),
  topic: text('topic').notNull(), // 'counterparty_stance' | 'key_risk' | 'timeline_pressure' | 'strategy_note'
  insight: text('insight').notNull(),
  confidence: doublePrecision('confidence').default(0.7),
  source_agent: text('source_agent').notNull(),
  source_evidence: jsonb('source_evidence'),
  supersedes: uuid('supersedes'), // self-referencing — previous insight this updates
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Agent Requests — agent-to-agent delegation with deadlock prevention
 */
export const agentRequests = pgTable('agent_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id).notNull(),
  requesting_agent: text('requesting_agent').notNull(),
  target_agent: text('target_agent').notNull(),
  request_type: text('request_type').notNull(), // 'information_needed' | 'review_requested' | 'action_needed'
  description: text('description').notNull(),
  context: jsonb('context'),
  status: text('status').notNull().default('pending'), // 'pending' | 'in_progress' | 'completed' | 'expired' | 'failed'
  response: jsonb('response'),
  chain_depth: integer('chain_depth').default(1), // max 3 for deadlock prevention
  expires_at: timestamp('expires_at', { withTimezone: true }), // default now + 1 hour set in SQL
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
});

/**
 * Meta Interventions — Meta Agent (Unsticker) activations
 */
export const metaInterventions = pgTable('meta_interventions', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  trigger_reason: text('trigger_reason').notNull(), // 'tool_failure' | 'low_score' | 'max_retries' | 'contradiction' | 'agent_request'
  trigger_entity_id: uuid('trigger_entity_id'),
  mode: text('mode').notNull(), // 'reroute' | 'decompose' | 'synthesize' | 'escalate'
  input_context: jsonb('input_context').notNull(),
  output_decision: jsonb('output_decision').notNull(),
  human_escalation: boolean('human_escalation').default(false),
  escalation_options: jsonb('escalation_options'),
  resolution_time_seconds: integer('resolution_time_seconds'),
  model_used: text('model_used').default('opus'),
  token_count: integer('token_count'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
