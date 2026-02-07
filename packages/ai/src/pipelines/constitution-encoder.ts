import { callClaude } from '../client';
import type { ConstitutionDelta, PartnerConstitution } from '@ma-deal-os/core';

export interface ConstitutionEncodingResult {
  delta: ConstitutionDelta;
  metadata: {
    model: string;
    input_length: number;
    items_extracted: number;
  };
}

const SYSTEM_PROMPT = `You are structuring a partner's deal preferences into a constitution for an M&A deal management system. Extract hard constraints (inviolable rules), preferences (defaults with override conditions), and strategic directives from the following natural language input.

Current constitution (if any) is provided for context — do not duplicate existing items.

Return ONLY valid JSON in this exact format:
{
  "add_constraints": [
    { "id": "c-<number>", "category": "<negotiation|communication|financial|drafting|process>", "description": "<what the partner said>", "rule": "<machine-readable rule>", "consequence": "<block_and_escalate|escalate|flag>" }
  ],
  "add_preferences": [
    { "id": "p-<number>", "category": "<category>", "description": "<what the partner said>", "default_behavior": "<what to do by default>", "override_condition": "<when it's ok to deviate>" }
  ],
  "add_directives": [
    { "id": "d-<number>", "description": "<strategic guidance>", "applies_to": ["<domain>"], "priority": "<primary|secondary|background>" }
  ],
  "modify": [],
  "reasoning": "<why these were extracted>"
}

Rules:
- Hard constraints are things that MUST or MUST NOT happen — firm lines, non-negotiable
- Preferences are defaults with flexibility — "prefer X unless Y"
- Strategic directives are overall approach guidance — tone, speed, priorities
- If unsure whether something is a constraint or preference, make it a preference
- Generate unique IDs using c-/p-/d- prefixes with incrementing numbers
- Categories: negotiation, communication, financial, drafting, process
- consequence levels: block_and_escalate (stop everything), escalate (flag for partner), flag (note it)`;

export async function encodeConstitution(
  message: string,
  existingConstitution?: PartnerConstitution | null
): Promise<ConstitutionEncodingResult> {
  const contextSection = existingConstitution
    ? `Current constitution:\n${JSON.stringify(existingConstitution, null, 2)}\n\n`
    : 'No existing constitution.\n\n';

  const response = await callClaude(
    [
      {
        role: 'user',
        content: `${contextSection}Partner says:\n"${message}"`,
      },
    ],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2048,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      delta: {
        add_constraints: [],
        add_preferences: [],
        add_directives: [],
        modify: [],
        reasoning: 'Failed to parse response',
      },
      metadata: {
        model: 'claude-sonnet-4-5-20250929',
        input_length: message.length,
        items_extracted: 0,
      },
    };
  }

  const delta: ConstitutionDelta = JSON.parse(jsonMatch[0]);
  const itemCount =
    (delta.add_constraints?.length || 0) +
    (delta.add_preferences?.length || 0) +
    (delta.add_directives?.length || 0) +
    (delta.modify?.length || 0);

  return {
    delta,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      input_length: message.length,
      items_extracted: itemCount,
    },
  };
}
