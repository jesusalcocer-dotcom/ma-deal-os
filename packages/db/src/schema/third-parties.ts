import { pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const dealThirdParties = pgTable('deal_third_parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  firm_name: text('firm_name').notNull(),
  contact_name: text('contact_name'),
  contact_email: text('contact_email'),
  deliverables: jsonb('deliverables').default([]),
  last_communication_at: timestamp('last_communication_at', { withTimezone: true }),
  outstanding_items: text('outstanding_items').array(),
  status: text('status').notNull().default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  dealIdx: index('deal_third_parties_deal_idx').on(table.deal_id),
  roleIdx: index('deal_third_parties_role_idx').on(table.role),
}));
