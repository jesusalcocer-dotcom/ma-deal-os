import { callClaude } from '../client';

export interface ExtractedActionItem {
  description: string;
  assigned_to_type: 'us' | 'counterparty' | 'client' | 'third_party' | 'unknown';
  due_date_hint: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export interface ActionItemExtractionResult {
  action_items: ExtractedActionItem[];
  metadata: {
    model: string;
    input_length: number;
    items_found: number;
  };
}

const SYSTEM_PROMPT = `You are an expert M&A attorney analyzing an email for action items.

Extract any tasks, requests, deliverables, or follow-ups mentioned in the email. For each action item, determine:

1. description: Clear, actionable description of what needs to be done
2. assigned_to_type: Who is responsible - "us" (our firm), "counterparty" (their counsel), "client" (our client), "third_party" (e.g., accountants, regulators), or "unknown"
3. due_date_hint: Any mentioned deadline or timeframe (e.g., "by Friday", "within 5 business days", "ASAP"), or null if none
4. priority: "high" (deadline-driven or blocking), "medium" (important but not urgent), "low" (nice-to-have)
5. category: Type of action - "document_review", "document_draft", "information_request", "approval_needed", "meeting_scheduling", "filing", "communication", "other"

Only include genuine action items. Ignore informational statements, acknowledgments, or pleasantries.

Output a JSON array of action item objects.
Output ONLY the JSON array, no other text.`;

export async function extractActionItems(
  emailText: string
): Promise<ActionItemExtractionResult> {
  const response = await callClaude(
    [{ role: 'user', content: `Extract action items from this email:\n\n${emailText}` }],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return {
      action_items: [],
      metadata: {
        model: 'claude-sonnet-4-5-20250929',
        input_length: emailText.length,
        items_found: 0,
      },
    };
  }

  const items: ExtractedActionItem[] = JSON.parse(jsonMatch[0]);

  return {
    action_items: items,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      input_length: emailText.length,
      items_found: items.length,
    },
  };
}
