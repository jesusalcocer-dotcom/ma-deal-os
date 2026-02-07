/**
 * Consistency Check Prompts
 */

export const CONSISTENCY_SYSTEM_PROMPT = `You are a cross-agent consistency checker for an M&A deal management system. Your job is to find contradictions between different work products produced by different agents for the same deal.

## What You're Looking For
1. **Disclosure vs. Email contradictions**: A disclosure says X but an email extraction says Y
2. **Position tracking contradictions**: A position marked "agreed" but a later email reopens it
3. **Checklist vs. Document contradictions**: Checklist item marked complete but subsequent document contradicts
4. **Count mismatches**: N schedules generated but M rep sections exist
5. **Temporal contradictions**: Events described in wrong order across work products
6. **Factual contradictions**: Different agents report different facts about the same entity

## Response Format
Return ONLY valid JSON:
{
  "contradictions": [
    {
      "source_entity_type": "disclosure_schedule|negotiation_position|email_extraction|checklist_item|dd_finding",
      "source_entity_id": "uuid or description",
      "conflicting_entity_type": "disclosure_schedule|negotiation_position|email_extraction|checklist_item|dd_finding",
      "conflicting_entity_id": "uuid or description",
      "description": "Clear description of the contradiction",
      "severity": "high|medium|low"
    }
  ]
}

## Severity Guidelines
- **high**: Direct factual contradiction that could affect deal outcome (e.g., "no litigation" vs. "pending arbitration")
- **medium**: Inconsistency that should be reviewed but may not be material (e.g., slightly different date references)
- **low**: Minor discrepancy or potential issue (e.g., formatting inconsistency across documents)

If no contradictions are found, return: { "contradictions": [] }`;

/**
 * Build the user prompt with all work products for consistency checking.
 */
export function buildConsistencyPrompt(data: {
  disclosures: Array<{ id: string; schedule_type: string; content: unknown }>;
  positions: Array<{ id: string; provision_type: string; status: string; current_position: unknown }>;
  emailExtractions: Array<{ id: string; subject: string; extracted_positions: unknown; action_items: unknown }>;
  checklistItems: Array<{ id: string; title: string; status: string }>;
  ddFindings: Array<{ id: string; topic: string; finding_type: string; description: string }>;
}): string {
  const sections: string[] = [];

  if (data.disclosures.length > 0) {
    sections.push(`## Disclosure Schedule Entries (${data.disclosures.length})\n${JSON.stringify(data.disclosures.slice(0, 20), null, 2)}`);
  }

  if (data.positions.length > 0) {
    sections.push(`## Negotiation Positions (${data.positions.length})\n${JSON.stringify(data.positions.slice(0, 20), null, 2)}`);
  }

  if (data.emailExtractions.length > 0) {
    sections.push(`## Email Extractions (${data.emailExtractions.length})\n${JSON.stringify(data.emailExtractions.slice(0, 15), null, 2)}`);
  }

  if (data.checklistItems.length > 0) {
    sections.push(`## Checklist Items (${data.checklistItems.length})\n${JSON.stringify(data.checklistItems.slice(0, 30), null, 2)}`);
  }

  if (data.ddFindings.length > 0) {
    sections.push(`## Due Diligence Findings (${data.ddFindings.length})\n${JSON.stringify(data.ddFindings.slice(0, 20), null, 2)}`);
  }

  if (sections.length === 0) {
    return 'No work products found for this deal. Return empty contradictions array.';
  }

  return `Analyze the following work products from a single deal for contradictions:\n\n${sections.join('\n\n')}`;
}
