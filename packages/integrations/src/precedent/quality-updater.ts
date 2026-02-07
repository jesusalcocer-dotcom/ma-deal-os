/**
 * Dynamic Quality Learning
 * Updates quality scores based on usage and feedback.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface QualityFeedbackEvent {
  formulation_id: string;
  feedback_type: 'approved' | 'modified' | 'rejected' | 'reused';
  modified_text?: string;
  deal_id?: string;
}

/**
 * Update quality score based on feedback.
 * - approved: +0.02 (max 1.0)
 * - modified: -0.02 (min 0.0), store partner's version as new formulation
 * - rejected: -0.05 (min 0.0)
 * - reused: +0.05 (used across multiple deals)
 */
export async function updateQualityFromFeedback(
  supabase: SupabaseClient,
  event: QualityFeedbackEvent
): Promise<void> {
  // Fetch current score
  const { data: formulation, error } = await supabase
    .from('provision_formulations')
    .select('id, composite_quality_score, provision_type_id, variant_id')
    .eq('id', event.formulation_id)
    .single();

  if (error || !formulation) {
    console.warn(`Formulation ${event.formulation_id} not found`);
    return;
  }

  const currentScore = formulation.composite_quality_score
    ? parseFloat(formulation.composite_quality_score)
    : 0.50;

  let adjustment = 0;

  switch (event.feedback_type) {
    case 'approved':
      adjustment = 0.02;
      break;
    case 'modified':
      adjustment = -0.02;
      // Store partner's modified version as a new high-quality formulation
      if (event.modified_text) {
        await supabase.from('provision_formulations').insert({
          provision_type_id: formulation.provision_type_id,
          variant_id: formulation.variant_id,
          text: event.modified_text,
          source_deal_id: event.deal_id || null,
          composite_quality_score: 0.85,
          source_firm: 'Partner Draft',
        });
      }
      break;
    case 'rejected':
      adjustment = -0.05;
      break;
    case 'reused':
      adjustment = 0.05;
      break;
  }

  const newScore = Math.max(0, Math.min(1.0, currentScore + adjustment));

  await supabase
    .from('provision_formulations')
    .update({ composite_quality_score: newScore })
    .eq('id', event.formulation_id);
}
