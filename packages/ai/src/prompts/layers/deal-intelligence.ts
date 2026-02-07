/**
 * Layer 4: Deal Intelligence — per-deal shared context from all agents.
 * Reads from deal_intelligence table, only latest non-superseded insights.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DealInsight {
  id: string;
  topic: string;
  insight: string;
  confidence: number;
  source_agent: string;
  created_at: string;
}

export async function getDealIntelligence(
  supabase: SupabaseClient,
  dealId: string
): Promise<DealInsight[]> {
  if (!dealId) return [];

  try {
    const { data, error } = await supabase
      .from('deal_intelligence')
      .select('id, topic, insight, confidence, source_agent, created_at')
      .eq('deal_id', dealId)
      .is('supersedes', null) // Only get latest in each chain
      .order('confidence', { ascending: false })
      .limit(10);

    if (error || !data) return [];

    return data.map((d: Record<string, unknown>) => ({
      id: String(d.id),
      topic: String(d.topic),
      insight: String(d.insight),
      confidence: Number(d.confidence),
      source_agent: String(d.source_agent),
      created_at: String(d.created_at),
    }));
  } catch {
    return [];
  }
}

export function formatIntelligence(insights: DealInsight[]): string {
  if (insights.length === 0) return '';

  return insights.map((ins) => {
    return `- **${ins.topic}** (from ${ins.source_agent}, confidence: ${ins.confidence.toFixed(2)}): ${ins.insight}`;
  }).join('\n');
}
