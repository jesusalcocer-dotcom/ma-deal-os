import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/deals/[dealId]/intelligence — list active deal intelligence
 * Params: topic
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');

    const db = supabase();

    // Get all insights, filter out superseded ones
    let query = db
      .from('deal_intelligence')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (topic) query = query.eq('topic', topic);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filter out superseded insights
    const supersededIds = new Set<string>();
    for (const ins of (data || [])) {
      if (ins.supersedes) supersededIds.add(ins.supersedes as string);
    }
    const active = (data || []).filter((ins: Record<string, unknown>) => !supersededIds.has(ins.id as string));

    return NextResponse.json({ intelligence: active });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deal intelligence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/deals/[dealId]/intelligence — add a new insight
 * Body: { topic, insight, confidence, source_agent, source_evidence? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const body = await request.json();
    const { topic, insight, confidence, source_agent, source_evidence } = body;

    if (!topic || !insight || confidence === undefined || !source_agent) {
      return NextResponse.json(
        { error: 'topic, insight, confidence, and source_agent are required' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Check for existing insight to create supersession chain
    const { data: existing } = await db
      .from('deal_intelligence')
      .select('id')
      .eq('deal_id', dealId)
      .eq('topic', topic)
      .eq('source_agent', source_agent)
      .order('created_at', { ascending: false })
      .limit(1);

    const supersedes = existing && existing.length > 0 ? existing[0].id : null;

    const { data, error } = await db.from('deal_intelligence').insert({
      deal_id: dealId,
      topic,
      insight,
      confidence,
      source_agent,
      source_evidence: source_evidence || null,
      supersedes,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ intelligence: data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add intelligence';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
