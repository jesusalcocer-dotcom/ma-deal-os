import { callClaude } from '../client';

export interface ExtractedPosition {
  provision_type: string;
  party: 'us' | 'counterparty';
  position: string;
  position_detail: Record<string, any>;
  confidence: number;
}

export interface PositionExtractionResult {
  positions: ExtractedPosition[];
  metadata: {
    model: string;
    input_length: number;
    positions_found: number;
  };
}

const SYSTEM_PROMPT = `You are an expert M&A attorney analyzing an email or markup document for negotiation positions.

Your task is to identify any explicit or implicit negotiation positions on deal provisions. For each position found, determine:

1. provision_type: The provision category (e.g., "indemnification.basket.type", "survival.general", "indemnification.cap.general", "covenants.non_compete.duration", "escrow.amount", "reps.materiality_scrape", "closing.mac_definition")
2. party: Whether this position is from "us" (our side/buyer) or "counterparty" (their side/seller)
3. position: A concise statement of the position
4. position_detail: Structured details (e.g., { "amount": "$750,000", "percentage": "0.5%", "type": "tipping" })
5. confidence: How confident you are this is a real position (0.0 to 1.0)

Only include positions with confidence >= 0.5. Ignore pleasantries, procedural comments, and non-substantive language.

Output a JSON array of position objects.
Output ONLY the JSON array, no other text.`;

export async function extractPositionsFromEmail(
  emailText: string,
  dealContext?: string
): Promise<PositionExtractionResult> {
  const contextSection = dealContext
    ? `\n\nDeal context:\n${dealContext}`
    : '';

  const response = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze this email/markup for negotiation positions:${contextSection}\n\nEmail text:\n${emailText}`,
      },
    ],
    {
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 4096,
      system: SYSTEM_PROMPT,
    }
  );

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return {
      positions: [],
      metadata: {
        model: 'claude-sonnet-4-5-20250929',
        input_length: emailText.length,
        positions_found: 0,
      },
    };
  }

  const positions: ExtractedPosition[] = JSON.parse(jsonMatch[0]);

  return {
    positions: positions.filter((p) => p.confidence >= 0.5),
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      input_length: emailText.length,
      positions_found: positions.length,
    },
  };
}
