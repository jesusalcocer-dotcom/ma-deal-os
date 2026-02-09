import type { gmail_v1 } from 'googleapis';
import { getGmailClient } from './client';
import { fetchRecentEmails, addLabel, type GmailMessage } from './fetch-emails';

export interface PushProcessingResult {
  emailAddress: string;
  historyId: string;
  newMessages: number;
  processedIds: string[];
}

let lastHistoryId: string | null = null;

/**
 * Process a Gmail push notification.
 *
 * When Gmail Watch fires, it sends the user's email and a historyId.
 * We use history.list to find new messages since the last known historyId,
 * then fetch and store them.
 */
export async function processGmailPush(
  emailAddress: string,
  historyId: string,
): Promise<PushProcessingResult> {
  const gmail = getGmailClient();
  const userId = 'me';

  const result: PushProcessingResult = {
    emailAddress,
    historyId,
    newMessages: 0,
    processedIds: [],
  };

  // Use history API if we have a previous historyId
  if (lastHistoryId) {
    try {
      const historyRes = await gmail.users.history.list({
        userId,
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
      });

      const histories = historyRes.data.history ?? [];
      const newMessageIds = new Set<string>();

      for (const history of histories) {
        for (const added of history.messagesAdded ?? []) {
          if (added.message?.id) {
            newMessageIds.add(added.message.id);
          }
        }
      }

      if (newMessageIds.size > 0) {
        // Fetch these specific messages
        const messages = await fetchMessagesByIds(gmail, userId, Array.from(newMessageIds));
        result.newMessages = messages.length;
        result.processedIds = messages.map(m => m.id);

        // Label as processed
        for (const msg of messages) {
          try {
            await addLabel(msg.id, 'deal-os-processed');
          } catch {
            // Non-critical
          }
        }
      }

      lastHistoryId = historyId;
      return result;
    } catch (err: any) {
      // If history is too old or invalid, fall through to full fetch
      if (err.code !== 404) {
        console.error('History list failed:', err.message);
      }
    }
  }

  // Fallback: fetch recent unprocessed emails
  lastHistoryId = historyId;

  const messages = await fetchRecentEmails({
    query: 'newer_than:1h -label:deal-os-processed',
    maxResults: 20,
  });

  result.newMessages = messages.length;
  result.processedIds = messages.map(m => m.id);

  for (const msg of messages) {
    try {
      await addLabel(msg.id, 'deal-os-processed');
    } catch {
      // Non-critical
    }
  }

  return result;
}

/**
 * Start a Gmail Watch for push notifications.
 * This must be called periodically (Gmail watch expires every 7 days).
 */
export async function startGmailWatch(
  topicName: string,
  labelIds: string[] = ['INBOX'],
  userId = 'me',
): Promise<{ historyId: string; expiration: string }> {
  const gmail = getGmailClient();

  const res = await gmail.users.watch({
    userId,
    requestBody: {
      topicName,
      labelIds,
    },
  });

  const watchHistoryId = String(res.data.historyId ?? '');
  const expiration = String(res.data.expiration ?? '');

  // Store the historyId for incremental fetching
  lastHistoryId = watchHistoryId;

  return { historyId: watchHistoryId, expiration };
}

/**
 * Stop an active Gmail Watch.
 */
export async function stopGmailWatch(userId = 'me'): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.stop({ userId });
}

async function fetchMessagesByIds(
  gmail: gmail_v1.Gmail,
  userId: string,
  messageIds: string[],
): Promise<Array<{ id: string; threadId: string }>> {
  const results: Array<{ id: string; threadId: string }> = [];

  const batchSize = 10;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map(async id => {
        try {
          const res = await gmail.users.messages.get({ userId, id, format: 'metadata' });
          return { id: res.data.id!, threadId: res.data.threadId! };
        } catch {
          return null;
        }
      }),
    );
    results.push(...fetched.filter((m): m is NonNullable<typeof m> => m !== null));
  }

  return results;
}
