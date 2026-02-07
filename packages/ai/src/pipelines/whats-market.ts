/**
 * What's-Market Analysis Pipeline
 * Provides data-driven market position analysis for provision types.
 */

import { callClaude } from '../client';

export interface WhatsMarketInput {
  provision_type: string;
  formulations: Array<{
    text: string;
    year: number | null;
    deal_size_range: string | null;
    source_firm: string | null;
    composite_quality_score: number | null;
  }>;
  deal_profile?: {
    size?: string;
    industry?: string;
    structure?: string;
  };
}

export interface WhatsMarketResult {
  provision_type: string;
  sample_size: number;
  summary: string;
  statistics: {
    most_common_variant: string;
    typical_values: string;
    trend: string;
  };
  metadata: {
    model: string;
    tokens_used: number;
  };
}

const SYSTEM_PROMPT = `You are an expert M&A attorney analyzing market data for a specific deal provision type. Given a set of precedent formulations, provide a what's-market analysis.

Your analysis should include:
1. Most common variant/approach seen in the data
2. Typical thresholds, values, or ranges (if applicable)
3. Any trend in recent deals vs older deals
4. How the current deal's profile might affect market positioning

Return ONLY valid JSON in this format:
{
  "most_common_variant": "description of most common approach",
  "typical_values": "typical thresholds or ranges seen",
  "trend": "direction of market movement",
  "summary": "2-3 sentence natural language summary for the deal team"
}`;

export async function analyzeWhatsMarket(
  input: WhatsMarketInput
): Promise<WhatsMarketResult> {
  const sampleTexts = input.formulations
    .slice(0, 10)
    .map((f, i) => {
      const meta = [
        f.year ? `Year: ${f.year}` : null,
        f.deal_size_range ? `Size: ${f.deal_size_range}` : null,
        f.source_firm ? `Firm: ${f.source_firm}` : null,
        f.composite_quality_score ? `Quality: ${f.composite_quality_score}` : null,
      ].filter(Boolean).join(', ');
      return `--- Formulation ${i + 1} (${meta}) ---\n${f.text.substring(0, 1000)}`;
    })
    .join('\n\n');

  const dealContext = input.deal_profile
    ? `\nDeal Profile: Size=${input.deal_profile.size || 'unknown'}, Industry=${input.deal_profile.industry || 'unknown'}, Structure=${input.deal_profile.structure || 'unknown'}`
    : '';

  const response = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze the market position for provision type: ${input.provision_type}\n\nSample size: ${input.formulations.length} formulations${dealContext}\n\n${sampleTexts}`,
      },
    ],
    {
      system: SYSTEM_PROMPT,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 1024,
    }
  );

  // Parse response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      provision_type: input.provision_type,
      sample_size: input.formulations.length,
      summary: 'Insufficient data for market analysis.',
      statistics: {
        most_common_variant: 'Unknown',
        typical_values: 'Unknown',
        trend: 'Unknown',
      },
      metadata: { model: 'claude-sonnet-4-5-20250929', tokens_used: 0 },
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    provision_type: input.provision_type,
    sample_size: input.formulations.length,
    summary: parsed.summary || '',
    statistics: {
      most_common_variant: parsed.most_common_variant || '',
      typical_values: parsed.typical_values || '',
      trend: parsed.trend || '',
    },
    metadata: { model: 'claude-sonnet-4-5-20250929', tokens_used: response.length },
  };
}
