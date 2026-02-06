import { pgTable, uuid, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { checklistItems } from './checklist-items';
import { deals } from './deals';
import { users } from './users';

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  checklist_item_id: uuid('checklist_item_id').references(() => checklistItems.id, { onDelete: 'cascade' }),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  version_number: integer('version_number').notNull(),
  version_label: text('version_label').notNull(),
  version_type: text('version_type').notNull(),
  file_path: text('file_path'),
  drive_file_id: text('drive_file_id'),
  file_hash: text('file_hash'),
  file_size_bytes: integer('file_size_bytes'),
  change_summary: jsonb('change_summary'),
  provision_changes: jsonb('provision_changes'),
  source: text('source'),
  source_email_id: uuid('source_email_id'),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
