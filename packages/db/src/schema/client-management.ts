import { pgTable, uuid, text, jsonb, timestamp, integer, boolean, date, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const clientContacts = pgTable('client_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role'),
  is_primary: boolean('is_primary').notNull().default(false),
  communication_preferences: jsonb('communication_preferences').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('client_contacts_deal_idx').on(table.deal_id),
}));

export const clientActionItems = pgTable('client_action_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  client_contact_id: uuid('client_contact_id').references(() => clientContacts.id),
  description: text('description').notNull(),
  detail: text('detail'),
  category: text('category'),
  due_date: date('due_date'),
  priority: text('priority').notNull().default('normal'),
  blocks_checklist_items: uuid('blocks_checklist_items').array(),
  related_disclosure_schedule_id: uuid('related_disclosure_schedule_id'),
  status: text('status').notNull().default('pending'),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  follow_up_count: integer('follow_up_count').notNull().default(0),
  last_follow_up_at: timestamp('last_follow_up_at', { withTimezone: true }),
  next_follow_up_at: timestamp('next_follow_up_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('client_action_items_deal_idx').on(table.deal_id),
  statusIdx: index('client_action_items_status_idx').on(table.status),
}));

export const clientCommunications = pgTable('client_communications', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  client_contact_id: uuid('client_contact_id').references(() => clientContacts.id),
  type: text('type').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  approved_by: uuid('approved_by'),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  generated_by: text('generated_by').notNull().default('system'),
  trigger_event_id: uuid('trigger_event_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('client_communications_deal_idx').on(table.deal_id),
  statusIdx: index('client_communications_status_idx').on(table.status),
}));
