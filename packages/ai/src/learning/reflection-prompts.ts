/**
 * Reflection Engine Prompts
 */

import type { SignalBundle, LearnedPattern } from './types';

export const REFLECTION_SYSTEM_PROMPT = `You are the Reflection Engine for an M&A deal automation system. You analyze quality signals from multiple agent types and identify systematic patterns.

## Your Role
- Read aggregated signal data (self-evaluations, consistency checks, variant comparisons, outcome signals, exemplar comparisons)
- Identify clusters of signals that suggest systematic patterns
- For each pattern: describe it in plain English, specify when it applies (conditions), and write an instruction that would improve future agent performance
- Minimum 3 supporting signals to propose a new pattern
- If existing patterns are contradicted by new evidence, reduce their confidence
- Be specific and actionable — patterns should directly improve agent prompts

## Pattern Types
- "quality_pattern": A recurring quality issue or strength (e.g., "email extraction consistently misses arbitration references in healthcare deals")
- "strategy_preference": A variant strategy that performs better in specific contexts (e.g., "conservative disclosure scores 30% higher for cross-border deals")
- "process_insight": A workflow observation (e.g., "checklist items added after week 3 are rarely completed")
- "rubric_gap": A missing or miscalibrated evaluation criterion
- "contradiction_pattern": Systematic contradictions between agent outputs

## Output Format
Return ONLY valid JSON:
{
  "new_patterns": [
    {
      "description": "Plain English description of the pattern",
      "pattern_type": "quality_pattern|strategy_preference|process_insight|rubric_gap|contradiction_pattern",
      "agent_type": "email_extraction|disclosure_generation|negotiation_tracking|checklist_management|document_generation|all",
      "instruction": "Specific instruction to inject into agent prompts when this pattern applies",
      "conditions": { "deal_type": "SPA", "industry": "healthcare" },
      "supporting_signal_count": 5,
      "initial_confidence": 0.35
    }
  ],
  "updated_patterns": [
    {
      "pattern_id": "uuid",
      "confidence_change": 0.05,
      "reason": "3 new supporting signals from recent healthcare deals",
      "new_supporting_count": 3
    }
  ],
  "decayed_patterns": [
    {
      "pattern_id": "uuid",
      "confidence_reduction": 0.10,
      "reason": "2 contradicting signals show pattern no longer holds for post-2024 deals",
      "contradicting_count": 2
    }
  ],
  "summary": "Brief summary of key findings"
}`;

export function buildReflectionPrompt(signals: SignalBundle, existingPatterns: LearnedPattern[]): string {
  const parts: string[] = [];

  parts.push(`## Signal Period: ${signals.period.since} to ${signals.period.until}`);
  parts.push(`## Total Signals: ${signals.totalSignals}\n`);

  // Signal summaries
  parts.push(`### Self-Evaluations (${signals.evaluations.count})`);
  parts.push(signals.evaluations.text);
  parts.push('');

  parts.push(`### Consistency Checks (${signals.consistencyChecks.count})`);
  parts.push(signals.consistencyChecks.text);
  parts.push('');

  parts.push(`### Variant Comparisons (${signals.variantComparisons.count})`);
  parts.push(signals.variantComparisons.text);
  parts.push('');

  parts.push(`### Outcome Signals (${signals.outcomeSignals.count})`);
  parts.push(signals.outcomeSignals.text);
  parts.push('');

  parts.push(`### Exemplar Comparisons (${signals.exemplarComparisons.count})`);
  parts.push(signals.exemplarComparisons.text);
  parts.push('');

  // Clusters
  if (Object.keys(signals.clusteredByAgent).length > 0) {
    parts.push('### Clusters by Agent Type');
    for (const [agent, cluster] of Object.entries(signals.clusteredByAgent)) {
      const avgStr = cluster.avgScore !== undefined ? `, avg score: ${cluster.avgScore.toFixed(2)}` : '';
      parts.push(`- **${agent}**: ${cluster.signalCount} signals${avgStr}`);
    }
    parts.push('');
  }

  if (Object.keys(signals.clusteredByDealType).length > 0) {
    parts.push('### Clusters by Deal Type');
    for (const [dealType, cluster] of Object.entries(signals.clusteredByDealType)) {
      parts.push(`- **${dealType}**: ${cluster.signalCount} signals`);
    }
    parts.push('');
  }

  // Existing patterns
  if (existingPatterns.length > 0) {
    parts.push(`### Existing Active Patterns (${existingPatterns.length})`);
    for (const p of existingPatterns.slice(0, 20)) {
      parts.push(`- [${p.id}] (${p.lifecycle_stage}, confidence: ${p.confidence}) ${p.description} — Agent: ${p.agent_type}, Type: ${p.pattern_type}`);
    }
    parts.push('');
  } else {
    parts.push('### Existing Active Patterns: None\n');
  }

  parts.push('Analyze these signals and identify patterns. Follow the output format specified in your system prompt.');

  return parts.join('\n');
}
