import { pgTable, uuid, text, jsonb, timestamp, integer, boolean, date, numeric, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const closingChecklists = pgTable('closing_checklists', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull().default('draft'),
  target_closing_date: date('target_closing_date'),
  conditions_satisfied: integer('conditions_satisfied').notNull().default(0),
  conditions_total: integer('conditions_total').notNull().default(0),
  conditions_waived: integer('conditions_waived').notNull().default(0),
  funds_flow: jsonb('funds_flow'),
  wire_instructions_confirmed: boolean('wire_instructions_confirmed').notNull().default(false),
  signature_pages_collected: jsonb('signature_pages_collected').default({}),
  signature_pages_released: boolean('signature_pages_released').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('closing_checklists_deal_idx').on(table.deal_id),
}));

export const closingConditions = pgTable('closing_conditions', {
  id: uuid('id').primaryKey().defaultRandom(),
  closing_checklist_id: uuid('closing_checklist_id').references(() => closingChecklists.id, { onDelete: 'cascade' }).notNull(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  condition_type: text('condition_type').notNull(),
  category: text('category'),
  responsible_party: text('responsible_party'),
  status: text('status').notNull().default('pending'),
  satisfied_at: timestamp('satisfied_at', { withTimezone: true }),
  evidence: text('evidence'),
  evidence_document_id: uuid('evidence_document_id'),
  blocks_closing: boolean('blocks_closing').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  checklistIdx: index('closing_conditions_checklist_idx').on(table.closing_checklist_id),
  dealIdx: index('closing_conditions_deal_idx').on(table.deal_id),
  statusIdx: index('closing_conditions_status_idx').on(table.status),
}));

export const closingDeliverables = pgTable('closing_deliverables', {
  id: uuid('id').primaryKey().defaultRandom(),
  closing_checklist_id: uuid('closing_checklist_id').references(() => closingChecklists.id, { onDelete: 'cascade' }).notNull(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  deliverable_type: text('deliverable_type'),
  responsible_party: text('responsible_party').notNull(),
  due_date: date('due_date'),
  status: text('status').notNull().default('pending'),
  received_at: timestamp('received_at', { withTimezone: true }),
  document_version_id: uuid('document_version_id'),
  drive_file_id: text('drive_file_id'),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  checklistIdx: index('closing_deliverables_checklist_idx').on(table.closing_checklist_id),
  dealIdx: index('closing_deliverables_deal_idx').on(table.deal_id),
}));

export const postClosingObligations = pgTable('post_closing_obligations', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  obligation_type: text('obligation_type'),
  responsible_party: text('responsible_party').notNull(),
  deadline: date('deadline'),
  recurring: boolean('recurring').notNull().default(false),
  recurrence_interval: text('recurrence_interval'),
  status: text('status').notNull().default('pending'),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  estimated_value: numeric('estimated_value'),
  actual_value: numeric('actual_value'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('post_closing_obligations_deal_idx').on(table.deal_id),
  statusIdx: index('post_closing_obligations_status_idx').on(table.status),
}));
