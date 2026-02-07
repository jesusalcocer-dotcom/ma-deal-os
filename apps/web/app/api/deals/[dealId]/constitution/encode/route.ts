import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { callClaude } from '@ma-deal-os/ai';

const ENCODE_SYSTEM_PROMPT = `You are structuring a partner's deal preferences into a constitution. Extract hard constraints (inviolable rules), preferences (defaults with override conditions), and strategic directives from the following natural language input.

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
- Generate unique IDs using c-/p-/d- prefixes with incrementing numbers`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Load existing constitution for context
    const { data: deal } = await db
      .from('deals')
      .select('id, constitution')
      .eq('id', dealId)
      .single();

    const existingConstitution = deal?.constitution || null;

    const userMessage = existingConstitution
      ? `Current constitution:\n${JSON.stringify(existingConstitution, null, 2)}\n\nPartner says:\n"${message}"`
      : `No existing constitution.\n\nPartner says:\n"${message}"`;

    const response = await callClaude(
      [{ role: 'user', content: userMessage }],
      {
        system: ENCODE_SYSTEM_PROMPT,
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 2048,
      }
    );

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse constitution delta from AI response' },
        { status: 500 }
      );
    }

    const delta = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      delta,
      raw_response: response,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to encode constitution' },
      { status: 500 }
    );
  }
}
