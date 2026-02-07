/**
 * Consistency Check Agent
 * Compares all work products across a deal to find contradictions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { ModelRouter } from '../routing/model-router';
import { CONSISTENCY_SYSTEM_PROMPT, buildConsistencyPrompt } from './consistency-prompts';
import type { ConsistencyResult } from './types';

export interface ConsistencyCheckResult {
  dealId: string;
  checkType: string;
  contradictions: ConsistencyResult[];
  modelUsed: string;
  tokenCount: number;
}

export class ConsistencyChecker {
  private supabase: SupabaseClient;
  private modelRouter: ModelRouter;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.modelRouter = new ModelRouter(supabase);
  }

  /**
   * Run consistency check for a single deal.
   */
  async checkDeal(dealId: string, checkType: string = 'on_demand'): Promise<ConsistencyCheckResult> {
    // 1. Gather all work products
    const [disclosures, positions, emailExtractions, checklistItems, ddFindings] = await Promise.all([
      this.getDisclosureEntries(dealId),
      this.getNegotiationPositions(dealId),
      this.getRecentEmailExtractions(dealId),
      this.getChecklistItems(dealId),
      this.getDDFindings(dealId),
    ]);

    // Skip if no data
    const totalItems = disclosures.length + positions.length + emailExtractions.length + checklistItems.length + ddFindings.length;
    if (totalItems === 0) {
      return { dealId, checkType, contradictions: [], modelUsed: 'none', tokenCount: 0 };
    }

    // 2. Build comparison prompt
    const prompt = buildConsistencyPrompt({ disclosures, positions, emailExtractions, checklistItems, ddFindings });

    // 3. Get model from router
    let modelId = 'claude-sonnet-4-5-20250929';
    let modelName = 'sonnet';
    try {
      const selection = await this.modelRouter.getModel('consistency_check');
      modelId = selection.modelId;
      modelName = selection.model;
    } catch {
      // Fallback
    }

    // 4. Call Claude to identify contradictions
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 2048,
      system: CONSISTENCY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const responseText = textBlock?.text ?? '';
    const tokenCount = response.usage.input_tokens + response.usage.output_tokens;

    // 5. Parse contradictions
    const contradictions = this.parseResponse(responseText);

    // 6. Store each contradiction
    for (const c of contradictions) {
      await this.storeCheck(dealId, checkType, c);
    }

    return { dealId, checkType, contradictions, modelUsed: modelName, tokenCount };
  }

  /**
   * Run consistency checks for all active deals.
   */
  async checkAllActiveDeals(checkType: string = 'nightly'): Promise<ConsistencyCheckResult[]> {
    const { data: deals } = await this.supabase
      .from('deals')
      .select('id')
      .eq('status', 'active')
      .limit(50);

    if (!deals || deals.length === 0) return [];

    const results: ConsistencyCheckResult[] = [];
    for (const deal of deals) {
      try {
        const result = await this.checkDeal(deal.id, checkType);
        results.push(result);
      } catch (err) {
        console.warn(`Consistency check failed for deal ${deal.id}:`, err);
      }
    }

    return results;
  }

  private parseResponse(responseText: string): ConsistencyResult[] {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.contradictions)) return [];

      return parsed.contradictions.map((c: Record<string, unknown>) => ({
        check_type: 'cross_agent',
        source_entity_type: String(c.source_entity_type || 'unknown'),
        source_entity_id: String(c.source_entity_id || ''),
        conflicting_entity_type: String(c.conflicting_entity_type || 'unknown'),
        conflicting_entity_id: String(c.conflicting_entity_id || ''),
        description: String(c.description || ''),
        severity: (['high', 'medium', 'low'].includes(String(c.severity)) ? c.severity : 'medium') as 'high' | 'medium' | 'low',
      }));
    } catch {
      return [];
    }
  }

  private async storeCheck(dealId: string, checkType: string, contradiction: ConsistencyResult): Promise<void> {
    try {
      await this.supabase.from('consistency_checks').insert({
        deal_id: dealId,
        check_type: checkType,
        source_entity_type: contradiction.source_entity_type,
        source_entity_id: contradiction.source_entity_id || '00000000-0000-0000-0000-000000000000',
        conflicting_entity_type: contradiction.conflicting_entity_type,
        conflicting_entity_id: contradiction.conflicting_entity_id || '00000000-0000-0000-0000-000000000000',
        description: contradiction.description,
        severity: contradiction.severity,
      });
    } catch {
      console.warn('Failed to store consistency check — table may not exist');
    }
  }

  private async getDisclosureEntries(dealId: string) {
    const { data } = await this.supabase
      .from('disclosure_schedules')
      .select('id, schedule_type, content')
      .eq('deal_id', dealId)
      .limit(20);
    return data || [];
  }

  private async getNegotiationPositions(dealId: string) {
    const { data } = await this.supabase
      .from('negotiation_positions')
      .select('id, provision_type, status, current_position')
      .eq('deal_id', dealId)
      .limit(20);
    return data || [];
  }

  private async getRecentEmailExtractions(dealId: string) {
    const { data } = await this.supabase
      .from('deal_emails')
      .select('id, subject, extracted_positions, action_items')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(15);
    return data || [];
  }

  private async getChecklistItems(dealId: string) {
    const { data } = await this.supabase
      .from('checklist_items')
      .select('id, title, status')
      .eq('deal_id', dealId)
      .limit(30);
    return data || [];
  }

  private async getDDFindings(dealId: string) {
    const { data } = await this.supabase
      .from('dd_findings')
      .select('id, topic_id, finding_type, description')
      .eq('deal_id', dealId)
      .limit(20);
    return (data || []).map(d => ({ ...d, topic: d.topic_id }));
  }
}
