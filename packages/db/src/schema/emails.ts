import { pgTable, uuid, text, boolean, decimal, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { deals } from './deals';

export const dealEmails = pgTable('deal_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  outlook_message_id: text('outlook_message_id').unique(),
  outlook_conversation_id: text('outlook_conversation_id'),
  thread_id: text('thread_id'),
  subject: text('subject').notNull(),
  sender_email: text('sender_email').notNull(),
  sender_name: text('sender_name'),
  recipients: jsonb('recipients'),
  received_at: timestamp('received_at', { withTimezone: true }).notNull(),
  classification: text('classification'),
  classification_confidence: decimal('classification_confidence', { precision: 3, scale: 2 }),
  related_checklist_items: uuid('related_checklist_items').array(),
  related_document_versions: uuid('related_document_versions').array(),
  body_preview: text('body_preview'),
  body_text: text('body_text'),
  has_attachments: boolean('has_attachments').default(false),
  attachments: jsonb('attachments').default([]),
  processing_status: text('processing_status').default('pending'),
  action_items: jsonb('action_items').default([]),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
