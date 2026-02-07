/**
 * Layer 5: Task Exemplars — concrete examples from exemplar library + distilled Opus outputs.
 * Provides few-shot examples that demonstrate high-quality output for similar deals.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Exemplar, DealCharacteristics } from '../../evaluation/exemplar-service';

export interface InjectedExemplar {
  id: string;
  quality_score: number;
  content_preview: string;
  source_type: string;
}

export async function getExemplars(
  supabase: SupabaseClient,
  taskType: string,
  dealId?: string
): Promise<InjectedExemplar[]> {
  try {
    // Get deal characteristics for matching
    let dealChars: DealCharacteristics = {};
    if (dealId) {
      const { data: deal } = await supabase
        .from('deals')
        .select('deal_type, parameters')
        .eq('id', dealId)
        .single();

      if (deal) {
        const params = deal.parameters as Record<string, unknown> || {};
        dealChars = {
          dealType: String(deal.deal_type || ''),
          industry: String(params.industry || ''),
          jurisdiction: String(params.jurisdiction || ''),
          sizeRange: String(params.sizeRange || ''),
        };
      }
    }

    // Check if this task type has been handed off to Sonnet (prefer distillation exemplars)
    const { data: routingConfig } = await supabase
      .from('model_routing_config')
      .select('distillation_status, current_model')
      .eq('task_type', taskType)
      .single();

    const preferDistillation = routingConfig?.distillation_status === 'handed_off' && routingConfig?.current_model === 'sonnet';

    // Query exemplars
    let query = supabase
      .from('exemplar_library')
      .select('id, content, quality_score, source_type, deal_characteristics')
      .eq('document_type', taskType)
      .order('quality_score', { ascending: false })
      .limit(10);

    if (preferDistillation) {
      query = query.eq('distillation_eligible', true);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // Score relevance to deal characteristics
    const rows = data as Array<Record<string, unknown>>;
    const scored = rows.map(exemplar => {
      let relevance = 0;
      const chars = exemplar.deal_characteristics as DealCharacteristics | null;
      if (chars?.dealType === dealChars.dealType) relevance += 3;
      if (chars?.industry === dealChars.industry) relevance += 2;
      if (chars?.jurisdiction === dealChars.jurisdiction) relevance += 2;
      return { exemplar, relevance };
    });

    scored.sort((a, b) => {
      const scoreA = (Number(a.exemplar.quality_score) || 0) * 0.5 + a.relevance * 0.5;
      const scoreB = (Number(b.exemplar.quality_score) || 0) * 0.5 + b.relevance * 0.5;
      return scoreB - scoreA;
    });

    return scored.slice(0, 3).map(e => ({
      id: String(e.exemplar.id),
      quality_score: Number(e.exemplar.quality_score),
      content_preview: JSON.stringify(e.exemplar.content).substring(0, 3000),
      source_type: String(e.exemplar.source_type),
    }));
  } catch {
    return [];
  }
}

export function formatExemplars(exemplars: InjectedExemplar[]): string {
  if (exemplars.length === 0) return '';

  return exemplars.map((ex, i) => {
    const sourceLabel = ex.source_type === 'internal_opus' ? 'AI-generated (validated)'
      : ex.source_type === 'internal_approved' ? 'Human-approved'
      : 'External reference';
    return `### Example ${i + 1} (${sourceLabel}, quality: ${ex.quality_score.toFixed(2)})\n${ex.content_preview}`;
  }).join('\n\n');
}
