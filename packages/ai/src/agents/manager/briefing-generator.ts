/**
 * Morning Briefing Generator
 * Produces a structured daily deal briefing via the Manager Agent.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { activateManager } from './manager-agent';
import type { Briefing } from '../types';

/**
 * Generate a morning briefing for a deal.
 * Activates the Manager Agent with a scheduled trigger to produce a structured briefing.
 */
export async function generateBriefing(
  supabase: SupabaseClient,
  dealId: string
): Promise<Briefing> {
  const result = await activateManager(supabase, {
    dealId,
    triggerType: 'scheduled',
    triggerSource: 'cron.morning_briefing',
  });

  // Parse the structured briefing from the response
  const briefing = parseBriefingResponse(result.response);

  return {
    ...briefing,
    metadata: {
      generated_at: new Date().toISOString(),
      model: result.activation.model_used,
      tokens_used:
        result.activation.input_tokens + result.activation.output_tokens,
    },
  };
}

/**
 * Parse the Manager Agent's response into a structured Briefing.
 */
function parseBriefingResponse(response: string): Omit<Briefing, 'metadata'> {
  // Try to extract JSON from the response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'No summary available',
        overnight_activity: parsed.overnight_activity || [],
        pending_approvals:
          typeof parsed.pending_approvals === 'number' ? parsed.pending_approvals : 0,
        critical_deadlines: parsed.critical_deadlines || [],
        recommended_priorities: parsed.recommended_priorities || [],
        risk_flags: parsed.risk_flags || [],
      };
    } catch {
      // Fall through to text parsing
    }
  }

  // Fallback: extract from text
  return {
    summary: extractSection(response, 'summary') || response.substring(0, 500),
    overnight_activity: extractBulletPoints(response, 'overnight') || [],
    pending_approvals: 0,
    critical_deadlines: [],
    recommended_priorities:
      extractBulletPoints(response, 'priorit') || [],
    risk_flags: extractBulletPoints(response, 'risk') || [],
  };
}

/**
 * Extract a text section from markdown-formatted response.
 */
function extractSection(text: string, keyword: string): string | null {
  const regex = new RegExp(
    `(?:^|\\n)#+\\s*.*?${keyword}.*?\\n([\\s\\S]*?)(?=\\n#+|$)`,
    'i'
  );
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract bullet points from a section.
 */
function extractBulletPoints(text: string, keyword: string): string[] {
  const section = extractSection(text, keyword);
  if (!section) return [];

  return section
    .split('\n')
    .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'))
    .map((line) => line.replace(/^[\s\-\*]+/, '').trim())
    .filter((line) => line.length > 0);
}
