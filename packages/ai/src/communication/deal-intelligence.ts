/**
 * Deal Intelligence Service — shared context store where agents read/write per-deal intelligence.
 * Supports supersession chains for versioned insights.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DealIntelligenceRecord {
  id: string;
  deal_id: string;
  topic: string;
  insight: string;
  confidence: number;
  source_agent: string;
  source_evidence: unknown;
  supersedes: string | null;
  created_at: string;
}

export class DealIntelligenceService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Add a new insight. If an existing insight from the same agent on the same topic exists,
   * it creates a supersession chain.
   */
  async addInsight(params: {
    dealId: string;
    topic: string;
    insight: string;
    confidence: number;
    sourceAgent: string;
    sourceEvidence?: unknown;
  }): Promise<DealIntelligenceRecord | null> {
    try {
      // Check for existing insight on this topic from this agent
      const existing = await this.getLatestInsight(params.dealId, params.topic, params.sourceAgent);

      const insertData: Record<string, unknown> = {
        deal_id: params.dealId,
        topic: params.topic,
        insight: params.insight,
        confidence: params.confidence,
        source_agent: params.sourceAgent,
        source_evidence: params.sourceEvidence || null,
        supersedes: existing?.id || null,
      };

      const { data, error } = await this.supabase
        .from('deal_intelligence')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.warn('Failed to add deal intelligence:', error.message);
        return null;
      }

      return data as unknown as DealIntelligenceRecord;
    } catch {
      return null;
    }
  }

  /**
   * Get all active (non-superseded) insights for a deal.
   */
  async getActiveInsights(dealId: string): Promise<DealIntelligenceRecord[]> {
    try {
      // Get all insights, then filter out ones that have been superseded
      const { data: allInsights } = await this.supabase
        .from('deal_intelligence')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (!allInsights) return [];

      // Build set of superseded IDs
      const supersededIds = new Set<string>();
      for (const ins of allInsights) {
        if (ins.supersedes) supersededIds.add(ins.supersedes as string);
      }

      // Return only non-superseded insights
      return (allInsights as unknown as DealIntelligenceRecord[]).filter(
        ins => !supersededIds.has(ins.id)
      );
    } catch {
      return [];
    }
  }

  /**
   * Get the full supersession chain for an insight.
   */
  async getInsightChain(insightId: string): Promise<DealIntelligenceRecord[]> {
    try {
      const chain: DealIntelligenceRecord[] = [];
      let currentId: string | null = insightId;

      // Walk back through the chain
      while (currentId) {
        const result = await this.supabase
          .from('deal_intelligence')
          .select('*')
          .eq('id', currentId)
          .single();

        if (!result.data) break;
        const row = result.data as Record<string, unknown>;
        chain.push(row as unknown as DealIntelligenceRecord);
        currentId = (row.supersedes as string) || null;
      }

      return chain;
    } catch {
      return [];
    }
  }

  /**
   * Get insights by topic for a deal.
   */
  async getInsightsByTopic(dealId: string, topic: string): Promise<DealIntelligenceRecord[]> {
    try {
      const { data } = await this.supabase
        .from('deal_intelligence')
        .select('*')
        .eq('deal_id', dealId)
        .eq('topic', topic)
        .order('created_at', { ascending: false });

      return (data || []) as unknown as DealIntelligenceRecord[];
    } catch {
      return [];
    }
  }

  /**
   * Get the latest insight from a specific agent on a specific topic.
   */
  private async getLatestInsight(
    dealId: string,
    topic: string,
    sourceAgent: string
  ): Promise<DealIntelligenceRecord | null> {
    try {
      const { data } = await this.supabase
        .from('deal_intelligence')
        .select('*')
        .eq('deal_id', dealId)
        .eq('topic', topic)
        .eq('source_agent', sourceAgent)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        return data[0] as unknown as DealIntelligenceRecord;
      }
      return null;
    } catch {
      return null;
    }
  }
}
