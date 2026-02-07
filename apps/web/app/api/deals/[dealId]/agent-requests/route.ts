import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/deals/[dealId]/agent-requests — list agent requests for a deal
 * Params: status, target_agent, requesting_agent
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const targetAgent = searchParams.get('target_agent');
    const requestingAgent = searchParams.get('requesting_agent');

    const db = supabase();
    let query = db
      .from('agent_requests')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (status) query = query.eq('status', status);
    if (targetAgent) query = query.eq('target_agent', targetAgent);
    if (requestingAgent) query = query.eq('requesting_agent', requestingAgent);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ requests: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch agent requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/deals/[dealId]/agent-requests — create a new agent request
 * Body: { requesting_agent, target_agent, request_type, description, context? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const body = await request.json();
    const { requesting_agent, target_agent, request_type, description, context } = body;

    if (!requesting_agent || !target_agent || !request_type || !description) {
      return NextResponse.json(
        { error: 'requesting_agent, target_agent, request_type, and description are required' },
        { status: 400 }
      );
    }

    const validTypes = ['information_needed', 'review_requested', 'action_needed'];
    if (!validTypes.includes(request_type)) {
      return NextResponse.json(
        { error: `request_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const db = supabase();

    // Deadlock check: circular requests
    const { data: reverse } = await db
      .from('agent_requests')
      .select('id')
      .eq('deal_id', dealId)
      .eq('requesting_agent', target_agent)
      .eq('target_agent', requesting_agent)
      .eq('status', 'pending')
      .limit(1);

    if (reverse && reverse.length > 0) {
      return NextResponse.json(
        { error: `Circular request detected: ${target_agent} already has pending request to ${requesting_agent}` },
        { status: 409 }
      );
    }

    // Chain depth check
    const { data: chain } = await db
      .from('agent_requests')
      .select('id')
      .eq('deal_id', dealId)
      .eq('requesting_agent', requesting_agent)
      .in('status', ['pending', 'in_progress']);

    if (chain && chain.length >= 3) {
      return NextResponse.json(
        { error: 'Max request chain depth (3) exceeded' },
        { status: 409 }
      );
    }

    const { data, error } = await db.from('agent_requests').insert({
      deal_id: dealId,
      requesting_agent,
      target_agent,
      request_type,
      description,
      context: context || null,
      status: 'pending',
      chain_depth: (chain?.length || 0) + 1,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create agent request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
