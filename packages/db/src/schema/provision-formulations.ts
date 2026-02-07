import { pgTable, uuid, text, integer, decimal, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const provisionTypes = pgTable('provision_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  parent_code: text('parent_code'),
  description: text('description'),
  applicable_doc_types: text('applicable_doc_types').array(),
  sort_order: integer('sort_order').default(0),
});

export const provisionVariants = pgTable('provision_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  provision_type_id: uuid('provision_type_id').references(() => provisionTypes.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  buyer_favorability: decimal('buyer_favorability', { precision: 3, scale: 2 }),
  market_frequency: decimal('market_frequency', { precision: 3, scale: 2 }),
  metadata: jsonb('metadata').default({}),
});

export const provisionFormulations = pgTable('provision_formulations', {
  id: uuid('id').primaryKey().defaultRandom(),
  provision_type_id: uuid('provision_type_id').references(() => provisionTypes.id),
  variant_id: uuid('variant_id').references(() => provisionVariants.id),
  text: text('text').notNull(),
  source_deal_id: uuid('source_deal_id'),
  source_document_type: text('source_document_type'),
  source_firm: text('source_firm'),
  favorability_score: decimal('favorability_score', { precision: 3, scale: 2 }),
  negotiation_outcome: text('negotiation_outcome'),
  deal_size_range: text('deal_size_range'),
  industry: text('industry'),
  year: integer('year'),
  firm_tier: decimal('firm_tier', { precision: 3, scale: 2 }),
  deal_size_score: decimal('deal_size_score', { precision: 3, scale: 2 }),
  recency_score: decimal('recency_score', { precision: 3, scale: 2 }),
  structural_quality_score: decimal('structural_quality_score', { precision: 3, scale: 2 }),
  corpus_alignment_score: decimal('corpus_alignment_score', { precision: 3, scale: 2 }),
  composite_quality_score: decimal('composite_quality_score', { precision: 3, scale: 2 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
