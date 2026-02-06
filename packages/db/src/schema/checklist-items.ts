import { pgTable, uuid, text, date, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { users } from './users';

export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  document_type: text('document_type').notNull(),
  document_name: text('document_name').notNull(),
  category: text('category'),
  trigger_rule: text('trigger_rule'),
  trigger_source: text('trigger_source').notNull(),
  status: text('status').notNull().default('identified'),
  ball_with: text('ball_with'),
  assigned_to: uuid('assigned_to').references(() => users.id),
  due_date: date('due_date'),
  priority: text('priority').default('normal'),
  depends_on: uuid('depends_on').array(),
  blocks: uuid('blocks').array(),
  current_document_version_id: uuid('current_document_version_id'),
  drive_file_id: text('drive_file_id'),
  notes: text('notes'),
  sort_order: integer('sort_order').default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
