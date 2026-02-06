import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { deals } from './deals';
import { checklistItems } from './checklist-items';
import { documentVersions } from './document-versions';

export const driveSyncRecords = pgTable('drive_sync_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  checklist_item_id: uuid('checklist_item_id').references(() => checklistItems.id),
  document_version_id: uuid('document_version_id').references(() => documentVersions.id),
  internal_file_path: text('internal_file_path'),
  internal_file_hash: text('internal_file_hash'),
  drive_file_id: text('drive_file_id').notNull(),
  drive_file_name: text('drive_file_name'),
  drive_modified_time: timestamp('drive_modified_time', { withTimezone: true }),
  drive_file_hash: text('drive_file_hash'),
  sync_status: text('sync_status').default('in_sync'),
  sync_direction: text('sync_direction'),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
  conflict_details: jsonb('conflict_details'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const dealAgentMemory = pgTable('deal_agent_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  memory_type: text('memory_type').notNull(),
  content: jsonb('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  actor_id: uuid('actor_id'),
  actor_type: text('actor_type').default('user'),
  action: text('action').notNull(),
  entity_type: text('entity_type'),
  entity_id: uuid('entity_id'),
  details: jsonb('details').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
