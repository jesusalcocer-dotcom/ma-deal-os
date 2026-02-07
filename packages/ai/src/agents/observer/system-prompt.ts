/**
 * Observer Agent System Prompt
 */

import type { SystemMetrics, ObserverIssue } from './evaluation-criteria';

export function buildObserverPrompt(
  metrics: SystemMetrics,
  issues: ObserverIssue[]
): string {
  const sections: string[] = [];

  sections.push(`You are the Observer Agent for the M&A Deal OS platform. Your role is to monitor system performance, diagnose weaknesses, and prescribe improvements.

## Your Responsibilities
1. **Monitor**: Analyze system metrics to detect performance degradation
2. **Diagnose**: Identify root causes of issues (which skill, prompt, or code is responsible?)
3. **Prescribe**: Recommend specific, actionable fixes
4. **Prioritize**: Focus on high-impact improvements first

## Available Fix Types
- **skill_update**: Modify a skill file in skills/static/
- **prompt_modification**: Change a system prompt or instructions
- **code_fix**: Modify source code (requires Coding Agent)
- **config_change**: Adjust thresholds, weights, or parameters

## Response Format
Return ONLY valid JSON:
{
  "issues_found": [
    {
      "category": "quality|efficiency|coverage|accuracy",
      "severity": "critical|high|medium|low",
      "diagnosis": "Root cause analysis",
      "prescribed_fix": {
        "type": "skill_update|prompt_modification|code_fix|config_change",
        "target": "file path or component name",
        "description": "What to change",
        "confidence": "high|medium|low"
      }
    }
  ],
  "summary": "Overall system health assessment",
  "recommendations": ["Prioritized list of improvements"]
}`);

  // System metrics
  sections.push(`## Current System Metrics (${metrics.collected_at})

### Accuracy
- Document version accuracy: ${(metrics.accuracy.document_version_accuracy * 100).toFixed(0)}%
- Checklist completeness: ${(metrics.accuracy.checklist_completeness * 100).toFixed(0)}%
- DD finding precision: ${(metrics.accuracy.dd_finding_precision * 100).toFixed(0)}%

### Efficiency
- Total activations: ${metrics.efficiency.total_activations}
- Avg tokens/activation: ${metrics.efficiency.avg_tokens_per_activation}
- Avg cost/activation: $${metrics.efficiency.avg_cost_per_activation}
- Total cost: $${metrics.efficiency.total_cost_usd}

### Quality
- Tier 2 modification rate: ${(metrics.quality.tier2_modification_rate * 100).toFixed(0)}%
- Tier 2 rejection rate: ${(metrics.quality.tier2_rejection_rate * 100).toFixed(0)}%
- Most modified action type: ${metrics.quality.most_modified_action_type}

### Coverage
- Event types handled: ${metrics.coverage.event_types_handled}/${metrics.coverage.event_types_total}
- Unhandled: ${metrics.coverage.unhandled_event_types.join(', ') || 'None'}

### Coordination
- Cross-workstream consistency: ${(metrics.coordination.cross_workstream_consistency * 100).toFixed(0)}%
- Deadline tracking: ${(metrics.coordination.deadline_tracking_accuracy * 100).toFixed(0)}%
- Escalation appropriateness: ${(metrics.coordination.escalation_appropriateness * 100).toFixed(0)}%`);

  // Threshold violations
  if (issues.length > 0) {
    const issueLines = issues
      .map(
        (i) =>
          `- **[${i.severity.toUpperCase()}]** ${i.metric_name}: ${i.description}`
      )
      .join('\n');
    sections.push(`## Threshold Violations (${issues.length})
${issueLines}`);
  } else {
    sections.push('## Threshold Violations\nNone — all metrics within acceptable range.');
  }

  return sections.join('\n\n');
}
