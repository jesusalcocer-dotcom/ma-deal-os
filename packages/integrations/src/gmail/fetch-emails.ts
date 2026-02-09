import type { gmail_v1 } from 'googleapis';
import { getGmailClient } from './client';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  date: string;
  snippet: string;
  bodyText: string;
  bodyHtml: string;
  labels: string[];
  hasAttachments: boolean;
  attachments: GmailAttachment[];
}

export interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface FetchEmailsOptions {
  query?: string;
  maxResults?: number;
  maxBodyBytes?: number;
  userId?: string;
}

const DEFAULT_QUERY = 'newer_than:1d -label:deal-os-processed';
const DEFAULT_MAX_RESULTS = 50;
const DEFAULT_MAX_BODY_BYTES = 20_000;

function parseHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseAddressList(raw: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(a => a.trim()).filter(Boolean);
}

function parseFromName(raw: string): string {
  const match = raw.match(/^"?([^"<]+)"?\s*</);
  return match?.[1]?.trim() ?? raw.split('@')[0] ?? '';
}

function parseFromEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return match?.[1] ?? raw.trim();
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined,
  mimeType: string,
  maxBytes: number,
): string {
  if (!payload) return '';

  // Direct body
  if (payload.mimeType === mimeType && payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return decoded.slice(0, maxBytes);
  }

  // Multipart — recurse
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part, mimeType, maxBytes);
      if (result) return result;
    }
  }

  return '';
}

function extractAttachments(payload: gmail_v1.Schema$MessagePart | undefined): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];
  if (!payload) return attachments;

  if (payload.filename && payload.body?.attachmentId) {
    attachments.push({
      filename: payload.filename,
      mimeType: payload.mimeType ?? 'application/octet-stream',
      size: payload.body.size ?? 0,
      attachmentId: payload.body.attachmentId,
    });
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      attachments.push(...extractAttachments(part));
    }
  }

  return attachments;
}

export async function fetchRecentEmails(opts: FetchEmailsOptions = {}): Promise<GmailMessage[]> {
  const gmail = getGmailClient();
  const userId = opts.userId ?? 'me';
  const query = opts.query ?? DEFAULT_QUERY;
  const maxResults = opts.maxResults ?? DEFAULT_MAX_RESULTS;
  const maxBodyBytes = opts.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  // List message IDs matching query
  const listRes = await gmail.users.messages.list({
    userId,
    q: query,
    maxResults,
  });

  const messageIds = listRes.data.messages ?? [];
  if (messageIds.length === 0) return [];

  // Fetch full messages in parallel (batches of 10)
  const messages: GmailMessage[] = [];
  const batchSize = 10;

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const fetched = await Promise.all(
      batch.map(async ({ id }) => {
        if (!id) return null;
        const res = await gmail.users.messages.get({
          userId,
          id,
          format: 'full',
        });
        return res.data;
      })
    );

    for (const msg of fetched) {
      if (!msg?.id || !msg.threadId) continue;
      const headers = msg.payload?.headers;
      const from = parseHeader(headers, 'From');
      const attachments = extractAttachments(msg.payload ?? undefined);

      messages.push({
        id: msg.id,
        threadId: msg.threadId,
        subject: parseHeader(headers, 'Subject'),
        from: parseFromEmail(from),
        fromName: parseFromName(from),
        to: parseAddressList(parseHeader(headers, 'To')),
        cc: parseAddressList(parseHeader(headers, 'Cc')),
        date: parseHeader(headers, 'Date'),
        snippet: msg.snippet ?? '',
        bodyText: extractBody(msg.payload ?? undefined, 'text/plain', maxBodyBytes),
        bodyHtml: extractBody(msg.payload ?? undefined, 'text/html', maxBodyBytes),
        labels: msg.labelIds ?? [],
        hasAttachments: attachments.length > 0,
        attachments,
      });
    }
  }

  return messages;
}

export async function addLabel(messageId: string, labelName: string, userId = 'me'): Promise<void> {
  const gmail = getGmailClient();

  // Find or create label
  const labelsRes = await gmail.users.labels.list({ userId });
  let label = labelsRes.data.labels?.find(l => l.name === labelName);

  if (!label) {
    const createRes = await gmail.users.labels.create({
      userId,
      requestBody: { name: labelName, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
    });
    label = createRes.data;
  }

  if (!label?.id) return;

  await gmail.users.messages.modify({
    userId,
    id: messageId,
    requestBody: { addLabelIds: [label.id] },
  });
}

export async function getAttachmentData(
  messageId: string,
  attachmentId: string,
  userId = 'me',
): Promise<Buffer> {
  const gmail = getGmailClient();
  const res = await gmail.users.messages.attachments.get({
    userId,
    messageId,
    id: attachmentId,
  });
  const data = res.data.data ?? '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}
