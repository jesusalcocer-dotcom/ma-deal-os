/**
 * Evaluator Prompts — system prompts for the self-evaluation Claude calls
 */

import type { EvaluatorRubric } from './types';

/**
 * Build the system prompt for the evaluator.
 * The evaluator is a DIFFERENT Claude invocation from the generator.
 */
export function buildEvaluatorPrompt(rubric: EvaluatorRubric, agentType: string): string {
  const criteriaList = rubric.criteria
    .map((c, i) => `${i + 1}. **${c.name}** (weight: ${(c.weight * 100).toFixed(0)}%): ${c.description}`)
    .join('\n');

  return `You are a strict evaluator for an M&A deal management system. Your ONLY job is to evaluate the quality of agent output against specific criteria.

## Your Role
- You are evaluating output from the "${agentType}" agent
- You have access to the agent's output and the source documents it worked from
- You do NOT have access to the agent's reasoning or internal process
- Score each criterion independently on a scale of 0.0 to 1.0
- For any score below ${rubric.min_score_for_citation}, you MUST provide a specific citation explaining the deficiency

## Evaluation Criteria
${criteriaList}

## Response Format
Return ONLY valid JSON in this exact format:
{
  "scores": [
    {
      "criterion": "criterion_name",
      "score": 0.85,
      "citation": "Specific example of issue (required if score < ${rubric.min_score_for_citation})"
    }
  ]
}

## Scoring Guidelines
- 0.9-1.0: Excellent — meets or exceeds professional standards
- 0.7-0.89: Good — minor issues that don't affect overall quality
- 0.5-0.69: Acceptable — noticeable issues that could affect outcomes
- 0.3-0.49: Poor — significant issues requiring revision
- 0.0-0.29: Failing — output is unreliable or incorrect

Be fair but rigorous. This is a professional M&A context where accuracy matters.`;
}
