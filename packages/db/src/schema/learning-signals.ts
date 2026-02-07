import { pgTable, uuid, text, jsonb, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';
import { deals } from './deals';

/**
 * Self Evaluations — every agent output reviewed by separate evaluator instance
 */
export const selfEvaluations = pgTable('self_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  agent_type: text('agent_type').notNull(),
  task_id: uuid('task_id'),
  output_snapshot: jsonb('output_snapshot').notNull(),
  criteria_scores: jsonb('criteria_scores').notNull(), // { "completeness": 0.85, "accuracy": 0.92, ... }
  issues_found: jsonb('issues_found').default([]),
  overall_score: doublePrecision('overall_score').notNull(),
  model_used: text('model_used').notNull(), // 'sonnet' | 'opus'
  token_count: integer('token_count'),
  evaluated_at: timestamp('evaluated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Consistency Checks — cross-agent consistency verification
 */
export const consistencyChecks = pgTable('consistency_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  check_type: text('check_type').notNull(), // 'nightly' | 'milestone' | 'on_demand'
  source_entity_type: text('source_entity_type').notNull(),
  source_entity_id: uuid('source_entity_id').notNull(),
  conflicting_entity_type: text('conflicting_entity_type').notNull(),
  conflicting_entity_id: uuid('conflicting_entity_id').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull().default('medium'), // 'high' | 'medium' | 'low'
  resolution: text('resolution'),
  resolved_by: text('resolved_by'), // 'auto' | 'human' | agent name
  detected_at: timestamp('detected_at', { withTimezone: true }).defaultNow(),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
});

/**
 * Variant Comparisons — competitive self-play with 3 strategy variants
 */
export const variantComparisons = pgTable('variant_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  task_type: text('task_type').notNull(),
  variants: jsonb('variants').notNull(), // [{ strategy: 'conservative', output: '...', score: 0.87 }, ...]
  selected_variant: text('selected_variant').notNull(),
  selection_reasoning: text('selection_reasoning'),
  context: jsonb('context'), // deal characteristics that influenced selection
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Outcome Signals — downstream metrics tracking agent calibration
 */
export const outcomeSignals = pgTable('outcome_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  signal_type: text('signal_type').notNull(), // 'ignored_output' | 'rewrite' | 'position_reopened' | 'calibration'
  agent_type: text('agent_type').notNull(),
  metric_name: text('metric_name').notNull(),
  metric_value: doublePrecision('metric_value').notNull(),
  context: jsonb('context'),
  measured_at: timestamp('measured_at', { withTimezone: true }).defaultNow(),
});

/**
 * Exemplar Library — gold-standard outputs for comparison and distillation
 */
export const exemplarLibrary = pgTable('exemplar_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  source_type: text('source_type').notNull(), // 'external_firm' | 'internal_opus' | 'internal_approved'
  source_firm: text('source_firm'), // 'wachtell' | 'sullivan_cromwell' | null for internal
  document_type: text('document_type').notNull(),
  deal_characteristics: jsonb('deal_characteristics'), // { deal_type, industry, jurisdiction, size_range }
  content: jsonb('content').notNull(),
  quality_score: doublePrecision('quality_score').notNull(),
  generation_model: text('generation_model'), // 'opus' | 'sonnet' | null for external
  generation_context: jsonb('generation_context'), // full prompt layers 1-5 that produced this
  evaluator_scores: jsonb('evaluator_scores'), // per-criteria scores from self-evaluation
  distillation_eligible: boolean('distillation_eligible').default(false),
  used_as_exemplar_count: integer('used_as_exemplar_count').default(0),
  downstream_quality_impact: doublePrecision('downstream_quality_impact'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Exemplar Comparisons — agent output vs exemplar gap analysis
 */
export const exemplarComparisons = pgTable('exemplar_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id),
  agent_output_id: uuid('agent_output_id'),
  exemplar_id: uuid('exemplar_id').references(() => exemplarLibrary.id),
  gaps_identified: jsonb('gaps_identified').default([]),
  improvements_suggested: jsonb('improvements_suggested').default([]),
  similarity_score: doublePrecision('similarity_score'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
