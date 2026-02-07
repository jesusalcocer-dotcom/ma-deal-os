import { callClaude } from '../client';

export interface ClosingConditionExtraction {
  description: string;
  condition_type: 'mutual' | 'buyer' | 'seller';
  category: string;
  responsible_party: string;
  blocks_closing: boolean;
}

export interface ClosingDeliverableExtraction {
  description: string;
  deliverable_type: string;
  responsible_party: string;
}

export interface ClosingGenerationResult {
  conditions: ClosingConditionExtraction[];
  deliverables: ClosingDeliverableExtraction[];
  metadata: {
    model: string;
    input_length: number;
    conditions_found: number;
    deliverables_found: number;
  };
}

const SYSTEM_PROMPT = `You are an expert M&A attorney analyzing a Stock Purchase Agreement (SPA) to extract all closing conditions and required closing deliverables.

Your task has two parts:

PART 1 - CLOSING CONDITIONS:
Identify every condition to closing from the SPA. These are typically found in the "Conditions to Closing" article (often Article VII or VIII). For each condition, extract:
1. description: Clear description of the condition
2. condition_type: "mutual" (both parties), "buyer" (buyer's conditions), or "seller" (seller's conditions)
3. category: One of "regulatory", "corporate", "financial", "legal", "third_party", "operational"
4. responsible_party: Who must satisfy this condition - "buyer", "seller", "mutual", "regulatory", or "third_party"
5. blocks_closing: true if this condition must be satisfied before closing can occur

If no explicit closing conditions article is found, generate standard M&A closing conditions based on the deal structure (HSR, board approval, no MAE, bring-down of reps, etc.).

PART 2 - CLOSING DELIVERABLES:
Identify standard closing deliverables that would be required for this type of transaction:
1. description: What must be delivered
2. deliverable_type: One of "certificate", "legal_opinion", "resolution", "consent", "release", "payoff_letter", "good_standing", "signature_page", "other"
3. responsible_party: "buyer", "seller", or "third_party"

Output a JSON object with two arrays: "conditions" and "deliverables".
Output ONLY the JSON object, no other text.`;

export async function generateClosingChecklist(
  spaText: string,
  dealContext?: { deal_type?: string; deal_value?: number }
): Promise<ClosingGenerationResult> {
  const contextLine = dealContext
    ? `\nDeal context: ${dealContext.deal_type || 'SPA'} transaction, value: $${((dealContext.deal_value || 0) / 1_000_000).toFixed(1)}M`
    : '';

  const response = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze this SPA and extract all closing conditions and deliverables:${contextLine}\n\n${spaText.substring(0, 80000)}`,
      },
    ],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 8192,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract closing checklist: no JSON object in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const conditions: ClosingConditionExtraction[] = parsed.conditions || [];
  const deliverables: ClosingDeliverableExtraction[] = parsed.deliverables || [];

  return {
    conditions,
    deliverables,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      input_length: spaText.length,
      conditions_found: conditions.length,
      deliverables_found: deliverables.length,
    },
  };
}
