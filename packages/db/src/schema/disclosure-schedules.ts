import { pgTable, uuid, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { checklistItems } from './checklist-items';

export const disclosureSchedules = pgTable('disclosure_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  schedule_number: text('schedule_number').notNull(),
  schedule_title: text('schedule_title').notNull(),
  related_rep_section: text('related_rep_section'),
  related_rep_text: text('related_rep_text'),
  related_checklist_item_id: uuid('related_checklist_item_id').references(() => checklistItems.id),
  status: text('status').notNull().default('pending'),
  entry_count: integer('entry_count').notNull().default(0),
  cross_reference_issues: jsonb('cross_reference_issues').default([]),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('disclosure_schedules_deal_idx').on(table.deal_id),
  statusIdx: index('disclosure_schedules_status_idx').on(table.status),
}));

export const disclosureEntries = pgTable('disclosure_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  schedule_id: uuid('schedule_id').references(() => disclosureSchedules.id, { onDelete: 'cascade' }).notNull(),
  entry_text: text('entry_text').notNull(),
  entry_type: text('entry_type').notNull().default('manual'),
  source_dd_finding_id: uuid('source_dd_finding_id'),
  source_email_id: uuid('source_email_id'),
  source_client_response: jsonb('source_client_response'),
  status: text('status').notNull().default('draft'),
  reviewed_by: uuid('reviewed_by'),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  metadata: jsonb('metadata').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  scheduleIdx: index('disclosure_entries_schedule_idx').on(table.schedule_id),
  typeIdx: index('disclosure_entries_type_idx').on(table.entry_type),
}));
