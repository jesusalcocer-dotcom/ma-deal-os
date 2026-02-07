/**
 * Deal Post-Mortem Pipeline
 * Automated knowledge extraction when a deal closes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude } from '../client';

export interface PostMortemResult {
  dealId: string;
  knowledgeEntries: Array<{
    knowledge_type: string;
    content: any;
    confidence: number;
  }>;
  summary: string;
  recommendations: string[];
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
  };
}

/**
 * Run a deal post-mortem to extract knowledge.
 */
export async function runDealPostMortem(
  supabase: SupabaseClient,
  dealId: string
): Promise<PostMortemResult> {
  // Collect deal data
  const [dealResult, feedbackResult, checklistResult, activityResult] = await Promise.all([
    supabase.from('deals').select('*').eq('id', dealId).single(),
    supabase.from('feedback_events').select('event_type, target_type, annotation').eq('deal_id', dealId),
    supabase.from('checklist_items').select('status').eq('deal_id', dealId),
    supabase.from('activity_log').select('action_type, created_at').eq('deal_id', dealId).order('created_at'),
  ]);

  const deal = dealResult.data;
  const feedbackEvents = feedbackResult.data || [];
  const checklistItems = checklistResult.data || [];
  const activities = activityResult.data || [];

  // Build analysis prompt
  const prompt = buildPostMortemPrompt(deal, feedbackEvents, checklistItems, activities);

  const response = await callClaude(
    [{ role: 'user', content: prompt }],
    {
      system: `You are analyzing a completed M&A deal for knowledge extraction. Return ONLY valid JSON with:
{
  "knowledge_entries": [
    { "knowledge_type": "negotiation_outcome|process_learning|provision_outcome", "content": {...}, "confidence": 0.0-1.0 }
  ],
  "summary": "Brief deal summary",
  "recommendations": ["Improvement for future deals"]
}`,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2048,
    }
  );

  // Parse response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  let parsed: { knowledge_entries: any[]; summary: string; recommendations: string[] } = {
    knowledge_entries: [],
    summary: 'Analysis complete.',
    recommendations: [],
  };

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed.summary = response.substring(0, 500);
    }
  }

  // Store knowledge entries
  for (const entry of parsed.knowledge_entries || []) {
    try {
      await supabase.from('deal_knowledge').insert({
        deal_id: dealId,
        knowledge_type: entry.knowledge_type,
        content: entry.content,
        confidence: entry.confidence?.toString(),
        sample_size: 1,
      });
    } catch {
      // Table may not exist
    }
  }

  const estimatedTokens = response.length * 1.3;
  const costUsd = (estimatedTokens / 1_000_000) * 15;

  return {
    dealId,
    knowledgeEntries: parsed.knowledge_entries || [],
    summary: parsed.summary,
    recommendations: parsed.recommendations || [],
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      tokens_used: Math.round(estimatedTokens),
      cost_usd: Math.round(costUsd * 10000) / 10000,
    },
  };
}

function buildPostMortemPrompt(
  deal: any,
  feedbackEvents: any[],
  checklistItems: any[],
  activities: any[]
): string {
  const feedbackSummary = {
    total: feedbackEvents.length,
    approved: feedbackEvents.filter((e) => e.event_type === 'approved').length,
    modified: feedbackEvents.filter((e) => e.event_type === 'modified').length,
    rejected: feedbackEvents.filter((e) => e.event_type === 'rejected').length,
    annotations: feedbackEvents
      .filter((e) => e.annotation)
      .map((e) => e.annotation)
      .slice(0, 5),
  };

  const checklistSummary = {
    total: checklistItems.length,
    completed: checklistItems.filter((c) => c.status === 'completed').length,
    pending: checklistItems.filter((c) => c.status !== 'completed').length,
  };

  return `Analyze this completed deal and extract knowledge:

## Deal
${JSON.stringify(deal?.parameters || {}, null, 2)}

## Feedback Summary
${JSON.stringify(feedbackSummary, null, 2)}

## Checklist Summary
${JSON.stringify(checklistSummary, null, 2)}

## Activity Count: ${activities.length}

Extract negotiation outcomes, process learnings, and provision outcomes.`;
}
