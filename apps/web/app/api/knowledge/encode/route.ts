import { NextResponse } from 'next/server';
import { callClaude } from '@ma-deal-os/ai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, deal_id, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a knowledge encoding system for an M&A law firm platform.

Your job is to extract structured knowledge entries from natural language input by an experienced M&A attorney.

## Knowledge Types
- negotiation_outcome: Past negotiation results and positions
- process_learning: Insights about deal process efficiency
- attorney_preference: Partner preferences for specific provisions, approaches, or conventions
- counterparty_pattern: Patterns observed in counterparty behavior
- provision_outcome: How specific provisions were negotiated and resolved

## Output Format
Return ONLY valid JSON:
{
  "entries": [
    {
      "knowledge_type": "attorney_preference",
      "content": {
        "category": "indemnification",
        "preference": "true deductible basket",
        "details": "Partner prefers true deductible over tipping basket",
        "conditions": "For all mid-market deals"
      },
      "confidence": 0.90,
      "tags": ["indemnification", "basket", "preference"]
    }
  ],
  "skill_annotations": [
    {
      "skill_type": "drafting convention",
      "description": "When drafting indemnification, default to true deductible basket"
    }
  ]
}`;

    const response = await callClaude(
      [{ role: 'user', content: `Extract structured knowledge from this attorney input:\n\n${message}${context ? `\n\nContext: ${context}` : ''}` }],
      {
        system: systemPrompt,
        model: 'claude-sonnet-4-5-20250929',
        maxTokens: 2048,
      }
    );

    // Parse the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    let result = { entries: [], skill_annotations: [] };

    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        result = { entries: [], skill_annotations: [] };
      }
    }

    return NextResponse.json({
      ...result,
      raw_input: message,
      deal_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to encode knowledge' },
      { status: 500 }
    );
  }
}
