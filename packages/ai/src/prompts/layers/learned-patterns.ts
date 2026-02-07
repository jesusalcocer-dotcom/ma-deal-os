/**
 * Layer 3: Learned Patterns — dynamic patterns from the Reflection Engine.
 * Only injects patterns that match the current deal context and meet confidence threshold.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface InjectedPattern {
  id: string;
  description: string;
  instruction: string;
  confidence: number;
  lifecycle_stage: string;
}

export async function getRelevantPatterns(
  supabase: SupabaseClient,
  agentType: string,
  dealId?: string
): Promise<InjectedPattern[]> {
  try {
    // Get config for min confidence and max patterns
    const minConfidence = await getConfigValue(supabase, 'learning.injection.min_confidence', 0.5);
    const maxPatterns = await getConfigValue(supabase, 'learning.injection.max_patterns_per_prompt', 5);

    // Query patterns for this agent type (or 'all') that are confirmed+
    let query = supabase
      .from('learned_patterns')
      .select('id, description, instruction, confidence, lifecycle_stage, conditions')
      .in('agent_type', [agentType, 'all'])
      .in('lifecycle_stage', ['confirmed', 'established', 'hard_rule'])
      .gte('confidence', minConfidence)
      .order('confidence', { ascending: false })
      .limit(Number(maxPatterns) * 2); // Over-fetch for context filtering

    const { data, error } = await query;
    if (error || !data) return [];

    // Filter by deal context conditions if deal_id provided
    let filtered = data as Array<Record<string, unknown>>;
    if (dealId) {
      const dealContext = await getDealContext(supabase, dealId);
      if (dealContext) {
        filtered = filtered.filter(p => matchesConditions(p.conditions as Record<string, unknown> | null, dealContext));
      }
    }

    return filtered.slice(0, Number(maxPatterns)).map(p => ({
      id: String(p.id),
      description: String(p.description),
      instruction: String(p.instruction),
      confidence: Number(p.confidence),
      lifecycle_stage: String(p.lifecycle_stage),
    }));
  } catch {
    return [];
  }
}

export function formatPatterns(patterns: InjectedPattern[]): string {
  if (patterns.length === 0) return '';

  return patterns.map((p, i) => {
    const stage = p.lifecycle_stage === 'hard_rule' ? '[HARD RULE]' : `[${p.lifecycle_stage}, confidence: ${p.confidence.toFixed(2)}]`;
    return `${i + 1}. ${stage} ${p.description}\n   Instruction: ${p.instruction}`;
  }).join('\n\n');
}

async function getDealContext(supabase: SupabaseClient, dealId: string): Promise<Record<string, unknown> | null> {
  try {
    const { data } = await supabase
      .from('deals')
      .select('deal_type, parameters')
      .eq('id', dealId)
      .single();

    if (!data) return null;
    const params = data.parameters as Record<string, unknown> || {};
    return {
      deal_type: data.deal_type,
      industry: params.industry,
      jurisdiction: params.jurisdiction,
      deal_value: params.dealValue || params.deal_value,
    };
  } catch {
    return null;
  }
}

function matchesConditions(conditions: Record<string, unknown> | null, dealContext: Record<string, unknown>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true; // No conditions = applies everywhere

  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined || value === null) continue;
    const contextValue = dealContext[key];
    if (contextValue !== undefined && contextValue !== value) return false;
  }
  return true;
}

async function getConfigValue(supabase: SupabaseClient, key: string, defaultValue: number): Promise<number> {
  try {
    const { data } = await supabase
      .from('learning_configuration')
      .select('config_value')
      .eq('config_key', key)
      .single();

    return Number((data?.config_value as Record<string, unknown>)?.value) || defaultValue;
  } catch {
    return defaultValue;
  }
}
