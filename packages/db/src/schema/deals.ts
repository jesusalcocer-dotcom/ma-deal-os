import { pgTable, uuid, text, numeric, date, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code_name: text('code_name'),
  status: text('status').notNull().default('active'),
  parameters: jsonb('parameters').notNull().default({}),
  deal_value: numeric('deal_value'),
  industry: text('industry'),
  buyer_type: text('buyer_type'),
  target_name: text('target_name'),
  buyer_name: text('buyer_name'),
  seller_name: text('seller_name'),
  drive_folder_id: text('drive_folder_id'),
  drive_folder_url: text('drive_folder_url'),
  deal_inbox_address: text('deal_inbox_address'),
  email_thread_ids: jsonb('email_thread_ids').default([]),
  expected_signing_date: date('expected_signing_date'),
  expected_closing_date: date('expected_closing_date'),
  actual_signing_date: date('actual_signing_date'),
  actual_closing_date: date('actual_closing_date'),
  lead_attorney_id: uuid('lead_attorney_id').references(() => users.id),
  monitoring_level: text('monitoring_level').notNull().default('active'),
  constitution: jsonb('constitution'),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const dealTeamMembers = pgTable('deal_team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id),
  role: text('role').notNull(),
  permissions: text('permissions').array().default([]),
  added_at: timestamp('added_at', { withTimezone: true }).defaultNow(),
});
