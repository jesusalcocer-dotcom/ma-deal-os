/**
 * Client Agent
 * Simulates business principals (seller CEO, buyer PE partner) with
 * personalities, objectives, and realistic imperfections.
 */

import type { ClientAgentConfig } from '@ma-deal-os/core';
import { callClaude } from '../../client';

export interface ClientResponse {
  content: string;
  delayed: boolean;
  delayReason?: string;
  incomplete: boolean;
  incompleteReason?: string;
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
  };
}

/**
 * Generate a client agent response to a request.
 */
export async function invokeClientAgent(
  config: ClientAgentConfig,
  request: string,
  context?: {
    previousExchanges?: string[];
    currentPhase?: string;
    daysElapsed?: number;
  }
): Promise<ClientResponse> {
  const systemPrompt = buildClientPrompt(config, context);

  const response = await callClaude(
    [{ role: 'user', content: request }],
    {
      system: systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 1500,
    }
  );

  // Parse response for delay/incompleteness markers
  const delayed = response.includes('[DELAYED]') || response.includes('[BUSY]');
  const incomplete = response.includes('[INCOMPLETE]') || response.includes('[PARTIAL]');

  // Clean markers from response
  const cleanContent = response
    .replace(/\[DELAYED\]/g, '')
    .replace(/\[BUSY\]/g, '')
    .replace(/\[INCOMPLETE\]/g, '')
    .replace(/\[PARTIAL\]/g, '')
    .trim();

  // Estimate cost (Sonnet: $3/$15 per M tokens)
  const estimatedTokens = response.length * 1.3;
  const costUsd = (estimatedTokens / 1_000_000) * 15;

  return {
    content: cleanContent,
    delayed,
    delayReason: delayed ? 'Client was unavailable' : undefined,
    incomplete,
    incompleteReason: incomplete ? 'Client provided partial information' : undefined,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      tokens_used: Math.round(estimatedTokens),
      cost_usd: Math.round(costUsd * 10000) / 10000,
    },
  };
}

function buildClientPrompt(
  config: ClientAgentConfig,
  context?: {
    previousExchanges?: string[];
    currentPhase?: string;
    daysElapsed?: number;
  }
): string {
  const sections: string[] = [];

  sections.push(`You are simulating ${config.name}, ${config.title}, in an M&A transaction.
You are the ${config.role} in this deal.

## Your Personality
- Response speed: ${config.personality.responseSpeed}
- Detail level: ${config.personality.detailLevel}
- Temperament: ${config.personality.temperament}

## Your Objectives
${config.objectives.map((o) => `- ${o}`).join('\n')}

## What You Know
${config.knowledge.map((k) => `- ${k}`).join('\n')}

## Realistic Imperfections (use 1-2 per response when appropriate)
${config.imperfections.map((i) => `- ${i}`).join('\n')}

## Response Rules
1. Stay in character at all times
2. Respond as the actual business person would — not as a lawyer
3. Use casual professional language appropriate to your role
4. If you would realistically be unavailable, prefix with [DELAYED] and explain briefly
5. If you would realistically provide incomplete information, prefix with [INCOMPLETE]
6. Do NOT volunteer information you wouldn't naturally share
7. Show appropriate emotion: impatience (seller), caution (buyer), etc.
8. Keep responses to 1-3 paragraphs unless the request requires detailed data`);

  if (context?.currentPhase) {
    sections.push(`## Current Deal Phase: ${context.currentPhase}`);
  }

  if (context?.daysElapsed !== undefined) {
    sections.push(`## Days Since LOI: ${context.daysElapsed}`);
  }

  if (context?.previousExchanges && context.previousExchanges.length > 0) {
    sections.push(`## Recent Exchanges\n${context.previousExchanges.slice(-3).join('\n---\n')}`);
  }

  return sections.join('\n\n');
}
