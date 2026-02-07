/**
 * Precedent Quality Updater
 * Processes feedback events to update formulation quality scores.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface FeedbackEvent {
  id: string;
  deal_id: string;
  event_type: 'approved' | 'modified' | 'rejected' | 'escalated' | 'annotation';
  target_type: string;
  target_id?: string;
  original_output?: any;
  modified_output?: any;
  modification_delta?: any;
  annotation?: string;
  agent_confidence?: number;
}

/**
 * Process a feedback event to update precedent quality scores.
 */
export async function processQualityFeedback(
  supabase: SupabaseClient,
  event: FeedbackEvent
): Promise<{ updated: number; created: number }> {
  let updated = 0;
  let created = 0;

  // Only process document-related actions that use precedent
  if (!event.target_type.includes('document') && !event.target_type.includes('provision')) {
    return { updated: 0, created: 0 };
  }

  // Get formulation IDs from the action context if available
  const formulationIds = extractFormulationIds(event);

  for (const formId of formulationIds) {
    const { data: formulation } = await supabase
      .from('provision_formulations')
      .select('id, composite_quality_score')
      .eq('id', formId)
      .single();

    if (!formulation) continue;

    const currentScore = parseFloat(formulation.composite_quality_score || '0.5');
    let newScore = currentScore;

    switch (event.event_type) {
      case 'approved':
        newScore = Math.min(1.0, currentScore + 0.02);
        break;
      case 'modified':
        newScore = Math.max(0.0, currentScore - 0.02);
        // Store the partner's modified version as a new high-quality formulation
        if (event.modified_output) {
          try {
            await supabase.from('provision_formulations').insert({
              provision_type_id: formulation.id, // Reference
              formulation_text: typeof event.modified_output === 'string'
                ? event.modified_output
                : JSON.stringify(event.modified_output),
              source: 'partner_authored',
              composite_quality_score: '0.85',
            });
            created++;
          } catch {
            // Table structure may not match perfectly
          }
        }
        break;
      case 'rejected':
        newScore = Math.max(0.0, currentScore - 0.05);
        break;
    }

    if (newScore !== currentScore) {
      await supabase
        .from('provision_formulations')
        .update({ composite_quality_score: newScore.toFixed(3) })
        .eq('id', formId);
      updated++;
    }
  }

  return { updated, created };
}

/**
 * Extract formulation IDs from the feedback event context.
 */
function extractFormulationIds(event: FeedbackEvent): string[] {
  const ids: string[] = [];

  // Check original_output for formulation references
  if (event.original_output?.formulation_ids) {
    ids.push(...event.original_output.formulation_ids);
  }
  if (event.original_output?.source_formulation_id) {
    ids.push(event.original_output.source_formulation_id);
  }

  return ids;
}
