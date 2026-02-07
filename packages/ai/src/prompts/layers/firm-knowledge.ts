/**
 * Layer 2: Firm Knowledge — manually curated firm practices and preferences.
 * Loaded from learning_configuration table or hardcoded defaults.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_FIRM_KNOWLEDGE: Record<string, string> = {
  disclosure_generation: `
- For Delaware asset purchases, always include Schedule 3.22 for environmental matters.
- For deals over $100M, include separate IP representations (Schedule 3.14).
- Use "material adverse effect" definition from firm template (includes carve-outs for general economic conditions).
- Disclosure schedules should cross-reference related representations.
  `.trim(),
  email_extraction: `
- Extract all explicit and implicit positions from counterparty communications.
- Flag any language suggesting regulatory concern or timing pressure.
- Note tone shifts between communications (escalation or conciliation indicators).
- Cross-reference extracted positions against the current negotiation tracker.
  `.trim(),
  negotiation_tracking: `
- Track both explicit positions and inferred positions separately.
- Flag any position that contradicts a previously stated position.
- Monitor for deadline-driven concessions (common near regulatory filing dates).
- Distinguish between anchor positions and actual bottom lines.
  `.trim(),
  document_generation: `
- All generated documents must follow firm formatting standards (12pt Times New Roman, 1-inch margins).
- Section numbering follows hierarchical format: Article I, Section 1.1, subsection (a).
- Always include a definitions section referencing the agreement's defined terms.
- For closing conditions, separate into buyer conditions and seller conditions.
  `.trim(),
  checklist_management: `
- Critical path items should be flagged within 48 hours of creation.
- Regulatory filing deadlines take priority over all other items.
- Third-party consents should be tracked separately with counterparty contact info.
- Week-over-week status reports should highlight new items and status changes.
  `.trim(),
};

export async function getFirmKnowledge(supabase: SupabaseClient, agentType: string): Promise<string> {
  // Try loading from DB first
  try {
    const { data } = await supabase
      .from('learning_configuration')
      .select('config_value')
      .eq('config_key', `firm_knowledge.${agentType}`)
      .single();

    if (data?.config_value) {
      const value = data.config_value as Record<string, unknown>;
      if (typeof value.content === 'string') return value.content;
    }
  } catch {
    // Fall through to defaults
  }

  return DEFAULT_FIRM_KNOWLEDGE[agentType] || '';
}
