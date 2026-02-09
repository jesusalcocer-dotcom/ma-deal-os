import { NextRequest, NextResponse } from 'next/server';
import { processGmailPush } from '@ma-deal-os/integrations';

/**
 * Gmail Watch Pub/Sub push endpoint.
 *
 * Google Pub/Sub sends a POST with:
 * {
 *   "message": {
 *     "data": "<base64-encoded JSON>",
 *     "messageId": "...",
 *     "publishTime": "..."
 *   },
 *   "subscription": "projects/.../subscriptions/..."
 * }
 *
 * The decoded data contains:
 * { "emailAddress": "user@gmail.com", "historyId": "12345" }
 *
 * We acknowledge immediately (200) then process in background.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify push token if configured
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const expectedToken = process.env.GMAIL_PUSH_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const body = await req.json();
    const message = body?.message;
    if (!message?.data) {
      return NextResponse.json({ error: 'Missing message data' }, { status: 400 });
    }

    // Decode the Pub/Sub message
    const decoded = Buffer.from(message.data, 'base64').toString('utf-8');
    let pushData: { emailAddress: string; historyId: string };
    try {
      pushData = JSON.parse(decoded);
    } catch {
      return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
    }

    // Acknowledge immediately — process in background
    // Using waitUntil pattern if available, otherwise fire-and-forget
    const processPromise = processGmailPush(pushData.emailAddress, pushData.historyId).catch(err => {
      console.error('Gmail push processing failed:', err);
    });

    // In Edge/Node runtime, we fire-and-forget. The response goes back immediately.
    // For Vercel, we'd use waitUntil. For self-hosted, the promise resolves in the background.
    void processPromise;

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Gmail webhook error:', error);
    // Return 200 anyway to prevent Pub/Sub retries on transient errors
    return NextResponse.json({ status: 'error', message: error.message });
  }
}
