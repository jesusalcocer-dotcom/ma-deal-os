/**
 * Third-Party Agent
 * Simulates external parties (escrow, R&W broker, accountant) in a deal.
 */

import type { ThirdPartyAgentConfig } from '@ma-deal-os/core';
import { callClaude } from '../../client';

export interface ThirdPartyResponse {
  content: string;
  deliverable?: string;
  delayMs: number;
  complication?: string;
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
  };
}

/**
 * Generate a third-party agent response.
 */
export async function invokeThirdPartyAgent(
  config: ThirdPartyAgentConfig,
  request: string,
  context?: {
    daysElapsed?: number;
    previousDeliverables?: string[];
  }
): Promise<ThirdPartyResponse> {
  // Determine if this triggers a complication
  const shouldComplicate = Math.random() < 0.3; // 30% chance
  const complication = shouldComplicate
    ? config.complications[Math.floor(Math.random() * config.complications.length)]
    : undefined;

  // Determine which deliverable to provide
  const previousCount = context?.previousDeliverables?.length ?? 0;
  const nextDeliverable = previousCount < config.deliverables.length
    ? config.deliverables[previousCount]
    : undefined;

  const systemPrompt = `You are ${config.name}, a professional ${config.role.replace(/_/g, ' ')}
involved in a $150M stock purchase transaction.

## Your Role
Respond professionally and concisely to requests from legal counsel.

## Available Deliverables
${config.deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

## Current Status
- Deliverables completed: ${previousCount}/${config.deliverables.length}
${nextDeliverable ? `- Next deliverable ready: ${nextDeliverable}` : '- All deliverables completed'}
${complication ? `\n## Complication to Introduce\nNaturally work this into your response: ${complication}` : ''}

## Response Rules
1. Be professional but brief (1-2 paragraphs)
2. Reference specific deal details when relevant
3. Include standard caveats and disclaimers for your profession
4. If introducing a complication, frame it as a routine professional requirement`;

  const response = await callClaude(
    [{ role: 'user', content: request }],
    {
      system: systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 800,
    }
  );

  const estimatedTokens = response.length * 1.3;
  const costUsd = (estimatedTokens / 1_000_000) * 15;

  return {
    content: response,
    deliverable: nextDeliverable,
    delayMs: config.responseDelayMs,
    complication,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      tokens_used: Math.round(estimatedTokens),
      cost_usd: Math.round(costUsd * 10000) / 10000,
    },
  };
}
