/**
 * Test Case Generator
 * Generates test cases from rejected or modified feedback events.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GeneratedTestCase {
  id: string;
  source_feedback_event_id: string;
  input_context: Record<string, any>;
  system_output: Record<string, any>;
  expected_output: Record<string, any>;
  annotation?: string;
  created_at: string;
}

/**
 * Generate test cases from feedback events.
 * Every rejected or heavily modified action becomes a regression test.
 */
export async function generateTestCases(
  supabase: SupabaseClient,
  options?: { dealId?: string; limit?: number }
): Promise<GeneratedTestCase[]> {
  let query = supabase
    .from('feedback_events')
    .select('*')
    .in('event_type', ['modified', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(options?.limit || 50);

  if (options?.dealId) {
    query = query.eq('deal_id', options.dealId);
  }

  const { data: events } = await query;
  if (!events || events.length === 0) return [];

  return events.map((event: any) => ({
    id: `tc-${event.id.slice(0, 8)}`,
    source_feedback_event_id: event.id,
    input_context: {
      deal_id: event.deal_id,
      target_type: event.target_type,
      target_id: event.target_id,
      agent_confidence: event.agent_confidence,
      agent_context_summary: event.agent_context_summary,
    },
    system_output: event.original_output || {},
    expected_output: event.event_type === 'modified'
      ? (event.modified_output || event.original_output || {})
      : { rejected: true, reason: event.annotation || 'Output rejected by partner' },
    annotation: event.annotation,
    created_at: event.created_at,
  }));
}
