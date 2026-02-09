import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { classifyEmails, type EmailForClassification } from '@ma-deal-os/ai';
import { fetchRecentEmails, addLabel } from '@ma-deal-os/integrations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || 'newer_than:1d -label:deal-os-processed';
    const maxResults = body.maxResults || 50;
    const dealId = body.dealId; // optional — assign classified emails to this deal

    // Step 1: Fetch recent emails from Gmail
    const gmailMessages = await fetchRecentEmails({ query, maxResults });

    if (gmailMessages.length === 0) {
      return NextResponse.json({
        message: 'No new emails found',
        classified: [],
        metadata: { total_emails: 0, deal_relevant: 0, classifications: {} },
      });
    }

    // Step 2: Convert to classification format
    const emailsForClassification: EmailForClassification[] = gmailMessages.map(msg => ({
      id: msg.id,
      subject: msg.subject,
      from: msg.from,
      fromName: msg.fromName,
      snippet: msg.snippet,
      bodyText: msg.bodyText,
      hasAttachments: msg.hasAttachments,
      attachmentFilenames: msg.attachments.map(a => a.filename),
    }));

    // Step 3: Classify with Claude (batch call)
    const result = await classifyEmails(emailsForClassification);

    // Step 4: Store results in database and mark as processed
    const stored: any[] = [];
    for (const classified of result.classified) {
      const gmailMsg = gmailMessages.find(m => m.id === classified.id);
      if (!gmailMsg) continue;

      const record = {
        outlook_message_id: gmailMsg.id, // reusing field for Gmail message ID
        thread_id: gmailMsg.threadId,
        subject: gmailMsg.subject,
        sender_email: gmailMsg.from,
        sender_name: gmailMsg.fromName || null,
        recipients: [
          ...gmailMsg.to.map(e => ({ email: e, type: 'to' })),
          ...gmailMsg.cc.map(e => ({ email: e, type: 'cc' })),
        ],
        received_at: new Date(gmailMsg.date).toISOString(),
        classification: classified.classification,
        classification_confidence: classified.confidence,
        body_preview: gmailMsg.snippet,
        body_text: gmailMsg.bodyText.slice(0, 50_000),
        has_attachments: gmailMsg.hasAttachments,
        attachments: gmailMsg.attachments.map(a => ({
          filename: a.filename,
          size: a.size,
          content_type: a.mimeType,
          processed: false,
        })),
        processing_status: 'classified',
        ...(dealId && classified.deal_relevance ? { deal_id: dealId } : {}),
      };

      const { data, error } = await supabase()
        .from('deal_emails')
        .upsert(record, { onConflict: 'outlook_message_id' })
        .select()
        .single();

      if (!error && data) {
        stored.push(data);
      }

      // Mark as processed in Gmail
      try {
        await addLabel(gmailMsg.id, 'deal-os-processed');
      } catch {
        // Non-critical — label might fail if label can't be created
      }
    }

    return NextResponse.json({
      message: `Classified ${result.classified.length} emails`,
      classified: result.classified,
      stored: stored.length,
      metadata: result.metadata,
    });
  } catch (error: any) {
    console.error('Failed to classify emails:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to classify emails' },
      { status: 500 },
    );
  }
}
