import { pgTable, uuid, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const observerChangelog = pgTable('observer_changelog', {
  id: uuid('id').primaryKey().defaultRandom(),
  change_type: text('change_type').notNull(), // 'skill_update', 'prompt_modification', 'code_fix', 'config_change'
  file_path: text('file_path'),
  description: text('description').notNull(),
  diagnosis: text('diagnosis'),
  prescribed_fix: text('prescribed_fix'),
  git_commit_hash: text('git_commit_hash'),
  test_results: jsonb('test_results'),
  confidence: text('confidence'), // 'high', 'medium', 'low'
  reverted: boolean('reverted').default(false),
  reverted_at: timestamp('reverted_at', { withTimezone: true }),
  needs_human_review: boolean('needs_human_review').default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
