import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase()
      .from('agent_activations')
      .select('agent_type, total_cost_usd, input_tokens, output_tokens, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch cost summary:', error);
      return NextResponse.json({ error: 'Failed to fetch cost summary' }, { status: 500 });
    }

    const activations = data || [];

    const byAgentType: Record<string, { cost: number; count: number }> = {};
    const byDayMap: Record<string, { cost: number; count: number }> = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const a of activations) {
      const cost = Number(a.total_cost_usd);
      totalCost += cost;
      totalInputTokens += a.input_tokens;
      totalOutputTokens += a.output_tokens;

      if (!byAgentType[a.agent_type]) {
        byAgentType[a.agent_type] = { cost: 0, count: 0 };
      }
      byAgentType[a.agent_type].cost += cost;
      byAgentType[a.agent_type].count += 1;

      const day = a.created_at.split('T')[0];
      if (!byDayMap[day]) {
        byDayMap[day] = { cost: 0, count: 0 };
      }
      byDayMap[day].cost += cost;
      byDayMap[day].count += 1;
    }

    const byDay = Object.entries(byDayMap).map(([date, stats]) => ({
      date,
      cost: Number(stats.cost.toFixed(6)),
      count: stats.count,
    }));

    return NextResponse.json({
      deal_id: dealId,
      total_cost_usd: Number(totalCost.toFixed(6)),
      total_activations: activations.length,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      by_agent_type: byAgentType,
      by_day: byDay,
    });
  } catch (error) {
    console.error('Failed to fetch cost summary:', error);
    return NextResponse.json({ error: 'Failed to fetch cost summary' }, { status: 500 });
  }
}
