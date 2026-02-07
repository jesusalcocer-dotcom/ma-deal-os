/**
 * Adaptive Skill Generator
 * Detects patterns in feedback events and generates adaptive skills.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DetectedPattern {
  id: string;
  target_type: string;
  modification_type: string;
  description: string;
  occurrences: number;
  examples: Array<{
    feedback_event_id: string;
    original: any;
    modified: any;
    annotation?: string;
  }>;
  confidence: number;
}

/**
 * Detect recurring modification patterns from feedback events.
 * A pattern is detected when the same kind of modification appears 3+ times.
 */
export async function detectPatterns(
  supabase: SupabaseClient,
  dealId?: string
): Promise<DetectedPattern[]> {
  let query = supabase
    .from('feedback_events')
    .select('*')
    .eq('event_type', 'modified')
    .order('created_at', { ascending: false })
    .limit(200);

  if (dealId) {
    query = query.eq('deal_id', dealId);
  }

  const { data: events } = await query;
  if (!events || events.length < 3) return [];

  // Group by target_type and look for patterns in modification_delta
  const groups: Record<string, any[]> = {};
  for (const event of events) {
    const key = event.target_type;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }

  const patterns: DetectedPattern[] = [];

  for (const [targetType, groupEvents] of Object.entries(groups)) {
    if (groupEvents.length < 3) continue;

    // Analyze modification deltas for common patterns
    const deltaPatterns = analyzeDeltas(groupEvents);

    for (const dp of deltaPatterns) {
      if (dp.occurrences >= 3) {
        patterns.push({
          id: `pattern-${targetType}-${dp.modification_type}`,
          target_type: targetType,
          modification_type: dp.modification_type,
          description: dp.description,
          occurrences: dp.occurrences,
          examples: dp.examples.slice(0, 3),
          confidence: Math.min(0.95, 0.5 + dp.occurrences * 0.1),
        });
      }
    }
  }

  return patterns;
}

/**
 * Analyze modification deltas to find common patterns.
 */
function analyzeDeltas(events: any[]): Array<{
  modification_type: string;
  description: string;
  occurrences: number;
  examples: any[];
}> {
  const patterns: Record<string, { count: number; examples: any[] }> = {};

  for (const event of events) {
    const delta = event.modification_delta;
    if (!delta) continue;

    // Extract modification type from delta
    const modType = extractModificationType(delta, event.annotation);

    if (!patterns[modType]) {
      patterns[modType] = { count: 0, examples: [] };
    }
    patterns[modType].count++;
    patterns[modType].examples.push({
      feedback_event_id: event.id,
      original: event.original_output,
      modified: event.modified_output,
      annotation: event.annotation,
    });
  }

  return Object.entries(patterns).map(([modType, data]) => ({
    modification_type: modType,
    description: `Partner consistently applies "${modType}" modification`,
    occurrences: data.count,
    examples: data.examples,
  }));
}

/**
 * Extract the type of modification from a delta.
 */
function extractModificationType(delta: any, annotation?: string): string {
  // Use annotation keywords if available
  if (annotation) {
    const lower = annotation.toLowerCase();
    if (lower.includes('tone')) return 'tone_change';
    if (lower.includes('formal') || lower.includes('casual')) return 'formality_change';
    if (lower.includes('basket')) return 'basket_type_change';
    if (lower.includes('cap')) return 'cap_modification';
    if (lower.includes('survival')) return 'survival_period_change';
    if (lower.includes('language') || lower.includes('stronger') || lower.includes('weaker')) return 'language_strength';
  }

  // Use delta keys
  if (delta.changed && Array.isArray(delta.changed)) {
    return delta.changed.join('_') + '_change';
  }

  return 'general_modification';
}

/**
 * Generate an adaptive skill file content from a detected pattern.
 */
export function generateSkillContent(pattern: DetectedPattern): string {
  return `---
id: adaptive-${pattern.id}
name: "${pattern.description}"
type: adaptive
category: partner-preference
triggers:
  - ${pattern.target_type}
confidence: ${pattern.confidence.toFixed(2)}
sample_size: ${pattern.occurrences}
generated_at: ${new Date().toISOString()}
---

# ${pattern.description}

## Pattern
- Target: ${pattern.target_type}
- Modification: ${pattern.modification_type}
- Observed ${pattern.occurrences} times
- Confidence: ${(pattern.confidence * 100).toFixed(0)}%

## Instruction
When generating content of type "${pattern.target_type}", apply the "${pattern.modification_type}" pattern.

## Examples
${pattern.examples.map((ex, i) => `### Example ${i + 1}
${ex.annotation ? `Note: ${ex.annotation}` : 'No annotation provided.'}
`).join('\n')}
`;
}
