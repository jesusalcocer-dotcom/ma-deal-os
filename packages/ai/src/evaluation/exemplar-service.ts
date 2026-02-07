/**
 * Exemplar Library Service
 * Manages gold-standard outputs for comparison and distillation.
 * Handles storing, querying, and matching exemplars to deal contexts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';

export interface DealCharacteristics {
  dealType?: string;
  industry?: string;
  jurisdiction?: string;
  sizeRange?: string;
}

export interface Exemplar {
  id: string;
  source_type: string;
  source_firm: string | null;
  document_type: string;
  deal_characteristics: DealCharacteristics | null;
  content: unknown;
  quality_score: number;
  generation_model: string | null;
  distillation_eligible: boolean;
  used_as_exemplar_count: number;
  downstream_quality_impact: number | null;
}

export interface ExemplarComparison {
  noExemplarAvailable?: boolean;
  exemplarId?: string;
  gapsIdentified?: string[];
  improvementsSuggested?: string[];
  similarityScore?: number;
}

export class ExemplarService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Store a new exemplar (external or internal).
   */
  async addExemplar(params: {
    sourceType: 'external_firm' | 'internal_opus' | 'internal_approved';
    sourceFirm?: string;
    documentType: string;
    dealCharacteristics: DealCharacteristics;
    content: unknown;
    qualityScore: number;
    generationModel?: string;
    generationContext?: unknown;
    evaluatorScores?: unknown;
  }): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.from('exemplar_library').insert({
        source_type: params.sourceType,
        source_firm: params.sourceFirm || null,
        document_type: params.documentType,
        deal_characteristics: params.dealCharacteristics,
        content: params.content,
        quality_score: params.qualityScore,
        generation_model: params.generationModel || null,
        generation_context: params.generationContext || null,
        evaluator_scores: params.evaluatorScores || null,
        distillation_eligible: params.sourceType === 'internal_opus',
      }).select('id').single();

      if (error) {
        console.warn('Failed to add exemplar:', error.message);
        return null;
      }
      return data?.id || null;
    } catch {
      console.warn('Failed to add exemplar — table may not exist');
      return null;
    }
  }

  /**
   * Find best exemplars for a given task context.
   * Matches on deal_characteristics overlap, sorted by quality_score * relevance.
   */
  async findExemplars(params: {
    documentType: string;
    dealCharacteristics: DealCharacteristics;
    limit?: number;
    preferDistillation?: boolean;
  }): Promise<Exemplar[]> {
    const limit = params.limit || 3;

    try {
      // Query exemplars of the right document type
      let query = this.supabase
        .from('exemplar_library')
        .select('*')
        .eq('document_type', params.documentType)
        .order('quality_score', { ascending: false })
        .limit(limit * 3); // Over-fetch for relevance filtering

      if (params.preferDistillation) {
        query = query.eq('distillation_eligible', true);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      // Score relevance based on deal characteristic overlap
      const scored = data.map((exemplar: Exemplar) => {
        let relevance = 0;
        const chars = exemplar.deal_characteristics as DealCharacteristics | null;

        if (chars?.dealType === params.dealCharacteristics.dealType) relevance += 3;
        if (chars?.industry === params.dealCharacteristics.industry) relevance += 2;
        if (chars?.jurisdiction === params.dealCharacteristics.jurisdiction) relevance += 2;
        if (chars?.sizeRange === params.dealCharacteristics.sizeRange) relevance += 1;

        // Boost exemplars with proven downstream impact
        if (exemplar.downstream_quality_impact && exemplar.downstream_quality_impact > 0) {
          relevance += exemplar.downstream_quality_impact * 2;
        }

        return { ...exemplar, relevance };
      });

      // Sort by combined quality + relevance, take top N
      scored.sort((a: { relevance: number; quality_score: number }, b: { relevance: number; quality_score: number }) =>
        (b.quality_score * 0.5 + b.relevance * 0.5) - (a.quality_score * 0.5 + a.relevance * 0.5)
      );

      return scored.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Compare agent output against best matching exemplar using Claude.
   */
  async compareToExemplar(
    agentOutput: string,
    dealContext: { dealId?: string },
    taskType: string,
    dealCharacteristics: DealCharacteristics
  ): Promise<ExemplarComparison> {
    const exemplars = await this.findExemplars({
      documentType: taskType,
      dealCharacteristics,
    });

    if (exemplars.length === 0) {
      return { noExemplarAvailable: true };
    }

    const bestExemplar = exemplars[0];

    // Use Claude to do gap analysis
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: `You are comparing an agent output against a gold-standard exemplar. Identify gaps, differences, and areas where the output could be improved.

Return ONLY valid JSON:
{
  "gaps_identified": ["gap description 1", "gap description 2"],
  "improvements_suggested": ["suggestion 1", "suggestion 2"],
  "similarity_score": 0.0-1.0
}`,
      messages: [{
        role: 'user',
        content: `## Agent Output\n${agentOutput.substring(0, 5000)}\n\n## Exemplar (Gold Standard)\n${JSON.stringify(bestExemplar.content).substring(0, 5000)}`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const responseText = textBlock?.text ?? '';

    // Parse response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let comparison: ExemplarComparison = {
      exemplarId: bestExemplar.id,
      gapsIdentified: [],
      improvementsSuggested: [],
      similarityScore: 0.5,
    };

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        comparison = {
          exemplarId: bestExemplar.id,
          gapsIdentified: Array.isArray(parsed.gaps_identified) ? parsed.gaps_identified : [],
          improvementsSuggested: Array.isArray(parsed.improvements_suggested) ? parsed.improvements_suggested : [],
          similarityScore: typeof parsed.similarity_score === 'number' ? parsed.similarity_score : 0.5,
        };
      } catch {
        // Use defaults
      }
    }

    // Store comparison
    await this.storeComparison(dealContext.dealId || null, comparison);

    // Increment usage count
    await this.incrementUsageCount(bestExemplar.id);

    return comparison;
  }

  /**
   * Update the exemplar count for a task type in model_routing_config.
   */
  async updateDistillationCount(taskType: string): Promise<void> {
    try {
      const { count } = await this.supabase
        .from('exemplar_library')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', taskType)
        .eq('distillation_eligible', true);

      await this.supabase
        .from('model_routing_config')
        .update({ exemplar_count: count || 0, updated_at: new Date().toISOString() })
        .eq('task_type', taskType);
    } catch {
      // Ignore if tables don't exist
    }
  }

  private async storeComparison(dealId: string | null, comparison: ExemplarComparison): Promise<void> {
    try {
      await this.supabase.from('exemplar_comparisons').insert({
        deal_id: dealId || null,
        exemplar_id: comparison.exemplarId || null,
        gaps_identified: comparison.gapsIdentified || [],
        improvements_suggested: comparison.improvementsSuggested || [],
        similarity_score: comparison.similarityScore,
      });
    } catch {
      console.warn('Failed to store exemplar comparison — table may not exist');
    }
  }

  private async incrementUsageCount(exemplarId: string): Promise<void> {
    try {
      // Use raw update to increment
      const { data } = await this.supabase
        .from('exemplar_library')
        .select('used_as_exemplar_count')
        .eq('id', exemplarId)
        .single();

      if (data) {
        await this.supabase
          .from('exemplar_library')
          .update({ used_as_exemplar_count: (data.used_as_exemplar_count || 0) + 1 })
          .eq('id', exemplarId);
      }
    } catch {
      // Ignore
    }
  }
}
