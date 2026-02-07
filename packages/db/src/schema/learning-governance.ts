import { pgTable, uuid, text, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Learning Audit Log — every system change tracked for reversibility
 */
export const learningAuditLog = pgTable('learning_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  event_type: text('event_type').notNull(), // 'pattern_created' | 'pattern_promoted' | 'model_promoted' | 'tool_generated' | 'skill_updated' | ...
  actor: text('actor').notNull(), // 'system:reflection_engine' | 'system:meta_agent' | 'user:email'
  entity_type: text('entity_type').notNull(), // 'pattern' | 'model_config' | 'tool' | 'skill' | ...
  entity_id: uuid('entity_id'),
  description: text('description').notNull(),
  before_state: jsonb('before_state'),
  after_state: jsonb('after_state'),
  reasoning: text('reasoning'),
  evidence: jsonb('evidence'),
  deal_id: uuid('deal_id'),
  reversible: boolean('reversible').default(true),
  reversed_by: uuid('reversed_by'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

/**
 * Learning Configuration — system-wide learning feature toggles and settings
 */
export const learningConfiguration = pgTable('learning_configuration', {
  id: uuid('id').primaryKey().defaultRandom(),
  config_key: text('config_key').notNull().unique(),
  config_value: jsonb('config_value').notNull(),
  updated_by: text('updated_by'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
