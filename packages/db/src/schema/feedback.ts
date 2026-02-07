import { pgTable, uuid, text, timestamp, jsonb, decimal, integer } from 'drizzle-orm/pg-core';

/**
 * Feedback Events — captures every human action on system output
 */
export const feedbackEvents = pgTable('feedback_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  deal_id: uuid('deal_id').notNull(),
  event_type: text('event_type').notNull(), // 'approved', 'modified', 'rejected', 'escalated', 'annotation'
  target_type: text('target_type').notNull(), // 'proposed_action', 'document_version', 'email_draft', etc.
  target_id: uuid('target_id'),
  original_output: jsonb('original_output'),
  modified_output: jsonb('modified_output'),
  modification_delta: jsonb('modification_delta'),
  annotation: text('annotation'),
  agent_confidence: decimal('agent_confidence', { precision: 4, scale: 3 }),
  agent_context_summary: text('agent_context_summary'),
  user_id: uuid('user_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Deal Knowledge — structured knowledge entries extracted from deals
 */
export const dealKnowledge = pgTable('deal_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),
  deal_id: uuid('deal_id'),
  knowledge_type: text('knowledge_type').notNull(), // 'negotiation_outcome', 'process_learning', 'attorney_preference', 'counterparty_pattern', 'deal_post_mortem', 'provision_outcome'
  content: jsonb('content').notNull(),
  confidence: decimal('confidence', { precision: 4, scale: 3 }),
  sample_size: integer('sample_size').default(1),
  source_feedback_ids: jsonb('source_feedback_ids'), // Array of feedback_event IDs that contributed
  tags: jsonb('tags'), // Searchable tags
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
