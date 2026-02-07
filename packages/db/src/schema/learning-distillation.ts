import { pgTable, uuid, text, jsonb, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';

/**
 * Distillation Trials — tracks Opus→Sonnet handoff testing
 */
export const distillationTrials = pgTable('distillation_trials', {
  id: uuid('id').primaryKey().defaultRandom(),
  task_type: text('task_type').notNull(),
  deal_context: jsonb('deal_context').notNull(),
  opus_score: doublePrecision('opus_score').notNull(),
  sonnet_score: doublePrecision('sonnet_score'), // without exemplars
  sonnet_with_exemplars_score: doublePrecision('sonnet_with_exemplars_score'), // with Opus exemplars injected
  exemplar_ids: jsonb('exemplar_ids').notNull(), // UUID[] stored as JSONB for REST API compat
  exemplar_count: integer('exemplar_count').notNull(),
  score_gap: doublePrecision('score_gap'), // opus_score - sonnet_with_exemplars_score
  recommendation: text('recommendation').notNull(), // 'approve_handoff' | 'reject_needs_more' | 'reject_too_complex'
  applied: boolean('applied').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Model Routing Config — per-task-type model selection and distillation state
 */
export const modelRoutingConfig = pgTable('model_routing_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  task_type: text('task_type').notNull().unique(),
  current_model: text('current_model').notNull().default('opus'), // 'sonnet' | 'opus'
  distillation_status: text('distillation_status').default('not_started'), // 'not_started' | 'collecting' | 'testing' | 'handed_off'
  exemplar_count: integer('exemplar_count').default(0),
  min_exemplars_for_testing: integer('min_exemplars_for_testing').default(15),
  handoff_threshold: doublePrecision('handoff_threshold').default(0.85),
  revert_threshold: doublePrecision('revert_threshold').default(0.80),
  spot_check_frequency: integer('spot_check_frequency').default(10), // every Nth invocation
  consecutive_low_scores: integer('consecutive_low_scores').default(0), // for auto-promotion
  consecutive_high_scores: integer('consecutive_high_scores').default(0), // for demotion suggestion
  last_spot_check_at: timestamp('last_spot_check_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
