import { pgTable, uuid, text, jsonb, timestamp, doublePrecision, integer, boolean } from 'drizzle-orm/pg-core';

/**
 * Learned Patterns — core of the learning system, discovered by Reflection Engine
 */
export const learnedPatterns = pgTable('learned_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  agent_type: text('agent_type'), // null = applies to all agents
  pattern_type: text('pattern_type').notNull(), // 'quality_improvement' | 'error_prevention' | 'strategy_preference' | 'context_rule'
  description: text('description').notNull(),
  condition: jsonb('condition').notNull(), // when this pattern applies: { deal_type, industry, jurisdiction, ... }
  instruction: text('instruction').notNull(), // what to do: injected into agent prompt
  confidence: doublePrecision('confidence').notNull().default(0.3),
  source_signals: jsonb('source_signals').default([]), // UUID[] stored as JSONB for REST API compat
  supporting_count: integer('supporting_count').default(0),
  contradicting_count: integer('contradicting_count').default(0),
  lifecycle_stage: text('lifecycle_stage').notNull().default('proposed'), // 'proposed' | 'confirmed' | 'established' | 'hard_rule' | 'decayed' | 'retired'
  version: integer('version').default(1),
  version_history: jsonb('version_history').default([]),
  last_applied_at: timestamp('last_applied_at', { withTimezone: true }),
  last_evaluated_at: timestamp('last_evaluated_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Reflection Runs — tracks each reflection engine execution
 */
export const reflectionRuns = pgTable('reflection_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  trigger_type: text('trigger_type').notNull(), // 'nightly' | 'milestone' | 'manual'
  deal_id: uuid('deal_id'), // null for cross-deal reflections
  signals_processed: integer('signals_processed').notNull(),
  patterns_created: integer('patterns_created').default(0),
  patterns_updated: integer('patterns_updated').default(0),
  patterns_decayed: integer('patterns_decayed').default(0),
  patterns_promoted: integer('patterns_promoted').default(0),
  summary: text('summary'),
  model_used: text('model_used').notNull(),
  token_count: integer('token_count'),
  duration_seconds: integer('duration_seconds'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Skill File Versions — tracks generated/evolved skill file changes
 */
export const skillFileVersions = pgTable('skill_file_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  file_path: text('file_path').notNull(),
  version: integer('version').notNull(),
  changes: jsonb('changes').notNull(), // diffs from previous version
  validation_results: jsonb('validation_results'), // test results against historical deals
  approved_by: text('approved_by'), // 'auto' | user UUID
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Generated Tools — tools created by the learning system from patterns
 */
export const generatedTools = pgTable('generated_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  tool_name: text('tool_name').notNull().unique(),
  source_pattern_id: uuid('source_pattern_id').references(() => learnedPatterns.id),
  description: text('description').notNull(),
  function_code: text('function_code').notNull(),
  usage_count: integer('usage_count').default(0),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  deprecated: boolean('deprecated').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
