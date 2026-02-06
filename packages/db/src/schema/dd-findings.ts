import { pgTable, uuid, text, numeric, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { users } from './users';

export const ddTopics = pgTable('dd_topics', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').unique().notNull(),
  name: text('name').notNull(),
  workstream: text('workstream').notNull(),
  parent_code: text('parent_code'),
  description: text('description'),
  sort_order: integer('sort_order').default(0),
});

export const ddFindings = pgTable('dd_findings', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  topic_id: uuid('topic_id').references(() => ddTopics.id),
  summary: text('summary').notNull(),
  detail: text('detail'),
  risk_level: text('risk_level').notNull(),
  risk_type: text('risk_type'),
  exposure_low: numeric('exposure_low'),
  exposure_mid: numeric('exposure_mid'),
  exposure_high: numeric('exposure_high'),
  exposure_basis: text('exposure_basis'),
  affects_provisions: jsonb('affects_provisions').default([]),
  affects_checklist_items: uuid('affects_checklist_items').array(),
  source_documents: jsonb('source_documents').default([]),
  source_qa_entries: jsonb('source_qa_entries').default([]),
  status: text('status').default('draft'),
  confirmed_by: uuid('confirmed_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
