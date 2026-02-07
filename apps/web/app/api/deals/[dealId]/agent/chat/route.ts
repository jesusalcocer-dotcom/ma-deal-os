import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { activateManager, activateSystemExpert } from '@ma-deal-os/ai';
import type { AgentMessage } from '@ma-deal-os/ai';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const body = await request.json();
    const {
      message,
      agent_type = 'manager',
      conversation_history = [],
    } = body as {
      message: string;
      agent_type: 'manager' | 'system_expert';
      conversation_history?: AgentMessage[];
    };

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const db = supabase();

    if (agent_type === 'system_expert') {
      const result = await activateSystemExpert(message, {
        supabase: db,
        conversationHistory: conversation_history,
        dealId,
      });

      return NextResponse.json({
        response: result.response,
        agent_type: 'system_expert',
        tokens_used:
          result.activation.input_tokens + result.activation.output_tokens,
        cost_usd: result.activation.total_cost_usd,
      });
    }

    // Default: Manager Agent
    const result = await activateManager(db, {
      dealId,
      triggerType: 'chat',
      triggerSource: 'agent_chat',
      query: message,
      conversationHistory: conversation_history,
    });

    return NextResponse.json({
      response: result.response,
      agent_type: 'manager',
      suggested_actions: result.suggested_actions,
      tokens_used:
        result.activation.input_tokens + result.activation.output_tokens,
      cost_usd: result.activation.total_cost_usd,
    });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Agent chat failed' },
      { status: 500 }
    );
  }
}
