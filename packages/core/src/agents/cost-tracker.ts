import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Model pricing per million tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4 },
  // Aliases
  'claude-sonnet': { input: 3, output: 15 },
  'claude-opus': { input: 15, output: 75 },
  'claude-haiku': { input: 0.80, output: 4 },
};

export interface ActivationParams {
  deal_id: string;
  agent_type: string;
  trigger_type: string;
  trigger_source?: string;
  trigger_event_id?: string;
  input_tokens: number;
  output_tokens: number;
  model_used: string;
  steps?: number;
  tool_calls?: number;
  specialist_invocations?: number;
  duration_ms?: number;
  status?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface CostSummary {
  total_cost_usd: number;
  total_activations: number;
  total_input_tokens: number;
  total_output_tokens: number;
  by_agent_type: Record<string, { cost: number; count: number }>;
  by_day: Array<{ date: string; cost: number; count: number }>;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet'];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not set');
  return createClient(url, key);
}

export async function trackActivation(
  params: ActivationParams,
  client?: SupabaseClient
): Promise<{ id: string; total_cost_usd: number }> {
  const supabase = client || getClient();
  const totalCost = calculateCost(params.input_tokens, params.output_tokens, params.model_used);

  const { data, error } = await supabase
    .from('agent_activations')
    .insert({
      deal_id: params.deal_id,
      agent_type: params.agent_type,
      trigger_type: params.trigger_type,
      trigger_source: params.trigger_source,
      trigger_event_id: params.trigger_event_id,
      input_tokens: params.input_tokens,
      output_tokens: params.output_tokens,
      total_cost_usd: totalCost,
      model_used: params.model_used,
      steps: params.steps || 0,
      tool_calls: params.tool_calls || 0,
      specialist_invocations: params.specialist_invocations || 0,
      duration_ms: params.duration_ms || 0,
      status: params.status || 'completed',
      error_message: params.error_message,
      metadata: params.metadata || {},
    })
    .select('id, total_cost_usd')
    .single();

  if (error) throw new Error(`Failed to track activation: ${error.message}`);
  return { id: data.id, total_cost_usd: Number(data.total_cost_usd) };
}

export async function getCostSummary(
  dealId: string,
  dateRange?: { from: string; to: string },
  client?: SupabaseClient
): Promise<CostSummary> {
  const supabase = client || getClient();

  let query = supabase
    .from('agent_activations')
    .select('agent_type, total_cost_usd, input_tokens, output_tokens, created_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });

  if (dateRange) {
    query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get cost summary: ${error.message}`);

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

  return {
    total_cost_usd: Number(totalCost.toFixed(6)),
    total_activations: activations.length,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    by_agent_type: byAgentType,
    by_day: byDay,
  };
}
