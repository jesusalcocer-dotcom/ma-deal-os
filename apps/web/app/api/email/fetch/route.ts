import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentEmails } from '@ma-deal-os/integrations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || 'newer_than:1d -label:deal-os-processed';
    const maxResults = parseInt(searchParams.get('maxResults') || '50', 10);

    const emails = await fetchRecentEmails({ query, maxResults });

    return NextResponse.json({
      emails,
      count: emails.length,
      query,
    });
  } catch (error: any) {
    console.error('Failed to fetch emails:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emails' },
      { status: 500 },
    );
  }
}
