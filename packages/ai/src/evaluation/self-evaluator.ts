/**
 * Self-Evaluation Service
 * Takes an agent output and produces structured evaluation via a separate Claude call.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { ModelRouter } from '../routing/model-router';
import { EVALUATOR_RUBRICS, calculateWeightedScore } from './rubrics';
import { buildEvaluatorPrompt } from './evaluator-prompts';
import type { CriterionScore, SelfEvaluation } from './types';

interface EvaluateParams {
  agentType: string;
  output: string;
  sourceDocuments: string[];
  dealContext: {
    dealId?: string;
    taskId?: string;
  };
}

export class SelfEvaluator {
  private supabase: SupabaseClient;
  private modelRouter: ModelRouter;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.modelRouter = new ModelRouter(supabase);
  }

  /**
   * Evaluate an agent output against its rubric.
   */
  async evaluate(params: EvaluateParams): Promise<SelfEvaluation> {
    const rubric = EVALUATOR_RUBRICS[params.agentType];
    if (!rubric) {
      throw new Error(`No rubric defined for agent type: ${params.agentType}`);
    }

    // Get model from router (self_evaluation defaults to sonnet)
    let modelId = 'claude-sonnet-4-5-20250929';
    let modelName = 'sonnet';
    try {
      const selection = await this.modelRouter.getModel('self_evaluation');
      modelId = selection.modelId;
      modelName = selection.model;
    } catch {
      // Fallback to sonnet if routing table doesn't exist
    }

    const anthropic = getAnthropicClient();

    // Build user message with output and source documents
    const sourceDocs = params.sourceDocuments.length > 0
      ? `\n\n## Source Documents\n${params.sourceDocuments.join('\n\n---\n\n')}`
      : '';

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 2048,
      system: buildEvaluatorPrompt(rubric, params.agentType),
      messages: [{
        role: 'user',
        content: `## Agent Output to Evaluate\n${params.output}${sourceDocs}`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const responseText = textBlock?.text ?? '';
    const tokenCount = response.usage.input_tokens + response.usage.output_tokens;

    // Parse structured scores
    const scores = this.parseEvaluatorResponse(responseText, rubric);
    const overallScore = calculateWeightedScore(scores, rubric);
    const issues = scores.filter(s => s.score < rubric.min_score_for_citation);

    // Store evaluation in database
    await this.storeEvaluation({
      dealId: params.dealContext.dealId,
      taskId: params.dealContext.taskId,
      agentType: params.agentType,
      outputSnapshot: params.output,
      criteriaScores: Object.fromEntries(scores.map(s => [s.criterion, s.score])),
      issuesFound: issues.map(s => ({ criterion: s.criterion, score: s.score, citation: s.citation })),
      overallScore,
      modelUsed: modelName,
      tokenCount,
    });

    return { scores, overallScore, issues, modelUsed: modelName, tokenCount };
  }

  /**
   * Parse the evaluator's JSON response into criterion scores.
   */
  private parseEvaluatorResponse(responseText: string, rubric: typeof EVALUATOR_RUBRICS[string]): CriterionScore[] {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If we can't parse, return default mid-range scores
      return rubric.criteria.map(c => ({
        criterion: c.name,
        score: 0.5,
        citation: 'Evaluation response could not be parsed',
      }));
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const scoreMap = new Map<string, { score: number; citation?: string }>();

      if (Array.isArray(parsed.scores)) {
        for (const s of parsed.scores) {
          if (s.criterion && typeof s.score === 'number') {
            scoreMap.set(s.criterion, {
              score: Math.min(1.0, Math.max(0.0, s.score)),
              citation: s.citation,
            });
          }
        }
      }

      // Ensure all criteria have scores (fill missing with 0.5)
      return rubric.criteria.map(c => {
        const found = scoreMap.get(c.name);
        return {
          criterion: c.name,
          score: found?.score ?? 0.5,
          citation: found?.citation,
        };
      });
    } catch {
      return rubric.criteria.map(c => ({
        criterion: c.name,
        score: 0.5,
        citation: 'Evaluation response could not be parsed',
      }));
    }
  }

  /**
   * Store the evaluation in the self_evaluations table.
   */
  private async storeEvaluation(params: {
    dealId?: string;
    taskId?: string;
    agentType: string;
    outputSnapshot: string;
    criteriaScores: Record<string, number>;
    issuesFound: Array<{ criterion: string; score: number; citation?: string }>;
    overallScore: number;
    modelUsed: string;
    tokenCount: number;
  }): Promise<void> {
    try {
      await this.supabase.from('self_evaluations').insert({
        deal_id: params.dealId || null,
        agent_type: params.agentType,
        task_id: params.taskId || null,
        output_snapshot: { text: params.outputSnapshot.substring(0, 10000) }, // cap stored size
        criteria_scores: params.criteriaScores,
        issues_found: params.issuesFound,
        overall_score: params.overallScore,
        model_used: params.modelUsed,
        token_count: params.tokenCount,
      });
    } catch {
      // Don't fail the evaluation if storage fails (table may not exist)
      console.warn('Failed to store self-evaluation — table may not exist');
    }
  }
}
