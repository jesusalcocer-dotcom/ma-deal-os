import { pgTable, uuid, text, jsonb, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const propagationEvents = pgTable('propagation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  source_entity_type: text('source_entity_type').notNull(),
  source_entity_id: uuid('source_entity_id').notNull(),
  payload: jsonb('payload').notNull().default({}),
  significance: integer('significance').notNull().default(3),
  processed: boolean('processed').default(false),
  processed_at: timestamp('processed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
