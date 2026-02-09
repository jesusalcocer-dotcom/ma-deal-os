#!/usr/bin/env npx tsx
/**
 * Start Gmail Watch — registers push notifications with Google Pub/Sub.
 *
 * This should be run:
 *   1. After setup-google.ts completes
 *   2. Periodically (Gmail watch expires every 7 days)
 *
 * Usage: npx tsx scripts/start-gmail-watch.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/web/.env.local
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const { startGmailWatch } = await import('@ma-deal-os/integrations');

  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    console.error('GMAIL_PUBSUB_TOPIC is not set. Run setup-google.ts first.');
    process.exit(1);
  }

  console.log(`Starting Gmail Watch...`);
  console.log(`  Topic: ${topic}`);

  const result = await startGmailWatch(topic);

  console.log(`Gmail Watch started:`);
  console.log(`  History ID: ${result.historyId}`);
  console.log(`  Expires: ${new Date(Number(result.expiration)).toISOString()}`);
  console.log(`\nNew emails will be pushed to your webhook endpoint.`);
}

main().catch(err => {
  console.error('Failed to start Gmail Watch:', err.message || err);
  process.exit(1);
});
