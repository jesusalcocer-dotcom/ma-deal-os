import { pgTable, uuid, text, real, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Skills Registry — tracks all skills (static, adaptive, dynamic)
 * with metadata for discovery and loading.
 */
export const skillsRegistry = pgTable('skills_registry', {
  id: uuid('id').defaultRandom().primaryKey(),
  skill_id: text('skill_id').notNull().unique(), // e.g., "domain/markup-analysis"
  type: text('type').notNull(), // "domain", "process", "meta", "adaptive", "dynamic"
  path: text('path').notNull(), // filesystem path relative to skills/
  version: text('version').notNull().default('1.0'),
  quality_score: real('quality_score').notNull().default(0.8),
  applicable_agents: jsonb('applicable_agents').$type<string[]>().default([]),
  applicable_tasks: jsonb('applicable_tasks').$type<string[]>().default([]),
  depends_on: jsonb('depends_on').$type<string[]>().default([]),
  source: text('source').notNull().default('static'), // "static", "adaptive", "dynamic"
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
