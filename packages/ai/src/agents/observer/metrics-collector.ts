/**
 * Metrics Collector
 * Functions that query databases to compute each evaluation metric.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccuracyCriteria,
  EfficiencyCriteria,
  QualityCriteria,
  CoverageCriteria,
  CoordinationCriteria,
  SystemMetrics,
  ObserverIssue,
} from './evaluation-criteria';
import { THRESHOLDS } from './evaluation-criteria';

export async function getAccuracyMetrics(
  supabase: SupabaseClient,
  dealId?: string
): Promise<AccuracyCriteria> {
  const filter = dealId ? { deal_id: dealId } : {};

  // Document version accuracy: % with status 'approved' vs total
  let docQuery = supabase.from('document_versions').select('id, status', { count: 'exact' });
  if (dealId) docQuery = docQuery.eq('deal_id', dealId);
  const { count: totalDocs } = await docQuery;

  let approvedQuery = supabase.from('document_versions').select('id', { count: 'exact' }).eq('status', 'approved');
  if (dealId) approvedQuery = approvedQuery.eq('deal_id', dealId);
  const { count: approvedDocs } = await approvedQuery;

  // Checklist completeness
  let checkQuery = supabase.from('checklist_items').select('id, status', { count: 'exact' });
  if (dealId) checkQuery = checkQuery.eq('deal_id', dealId);
  const { count: totalCheck } = await checkQuery;

  let trackedQuery = supabase.from('checklist_items').select('id', { count: 'exact' }).neq('status', 'not_started');
  if (dealId) trackedQuery = trackedQuery.eq('deal_id', dealId);
  const { count: trackedCheck } = await trackedQuery;

  // DD finding precision
  let ddQuery = supabase.from('dd_findings').select('id, status', { count: 'exact' });
  if (dealId) ddQuery = ddQuery.eq('deal_id', dealId);
  const { count: totalDD } = await ddQuery;

  let confirmedQuery = supabase.from('dd_findings').select('id', { count: 'exact' }).eq('status', 'confirmed');
  if (dealId) confirmedQuery = confirmedQuery.eq('deal_id', dealId);
  const { count: confirmedDD } = await confirmedQuery;

  return {
    document_version_accuracy: totalDocs ? (approvedDocs || 0) / totalDocs : 1.0,
    checklist_completeness: totalCheck ? (trackedCheck || 0) / totalCheck : 0,
    dd_finding_precision: totalDD ? (confirmedDD || 0) / totalDD : 1.0,
    provision_classification_accuracy: 0.80, // Placeholder until classification tracking exists
  };
}

export async function getEfficiencyMetrics(
  supabase: SupabaseClient,
  dealId?: string
): Promise<EfficiencyCriteria> {
  let query = supabase.from('agent_activations')
    .select('input_tokens, output_tokens, total_cost_usd, duration_ms');
  if (dealId) query = query.eq('deal_id', dealId);
  const { data: activations } = await query;

  if (!activations || activations.length === 0) {
    return {
      avg_tokens_per_activation: 0,
      avg_cost_per_activation: 0,
      avg_processing_time_ms: 0,
      total_activations: 0,
      total_cost_usd: 0,
    };
  }

  const totalTokens = activations.reduce((s: number, a: any) => s + (a.input_tokens || 0) + (a.output_tokens || 0), 0);
  const totalCost = activations.reduce((s: number, a: any) => s + parseFloat(a.total_cost_usd || '0'), 0);
  const totalTime = activations.reduce((s: number, a: any) => s + (a.duration_ms || 0), 0);

  return {
    avg_tokens_per_activation: Math.round(totalTokens / activations.length),
    avg_cost_per_activation: Math.round((totalCost / activations.length) * 100) / 100,
    avg_processing_time_ms: Math.round(totalTime / activations.length),
    total_activations: activations.length,
    total_cost_usd: Math.round(totalCost * 100) / 100,
  };
}

export async function getQualityMetrics(
  supabase: SupabaseClient,
  dealId?: string
): Promise<QualityCriteria> {
  // Get Tier 2 action chains
  let query = supabase.from('action_chains')
    .select('id, approval_tier, status, summary');
  if (dealId) query = query.eq('deal_id', dealId);
  query = query.eq('approval_tier', 2);
  const { data: chains } = await query;

  if (!chains || chains.length === 0) {
    return {
      tier2_modification_rate: 0,
      tier2_rejection_rate: 0,
      most_modified_action_type: 'none',
      modification_patterns: [],
    };
  }

  const modified = chains.filter((c: any) => c.status === 'modified').length;
  const rejected = chains.filter((c: any) => c.status === 'rejected').length;

  return {
    tier2_modification_rate: modified / chains.length,
    tier2_rejection_rate: rejected / chains.length,
    most_modified_action_type: 'unknown', // Would need proposed_actions join
    modification_patterns: [],
  };
}

export async function getCoverageMetrics(
  supabase: SupabaseClient,
  dealId?: string
): Promise<CoverageCriteria> {
  // Known event types
  const allEventTypes = [
    'dd.finding_confirmed', 'document.markup_received', 'email.position_extracted',
    'checklist.item_overdue', 'deal.parameters_updated', 'closing.condition_satisfied',
  ];

  // Check which events have been emitted
  let query = supabase.from('propagation_events').select('event_type');
  if (dealId) query = query.eq('deal_id', dealId);
  const { data: events } = await query;

  const handledTypes = new Set((events || []).map((e: any) => e.event_type));

  return {
    event_types_handled: handledTypes.size,
    event_types_total: allEventTypes.length,
    unhandled_event_types: allEventTypes.filter((t) => !handledTypes.has(t)),
    consequence_map_coverage: handledTypes.size / allEventTypes.length,
  };
}

export async function getCoordinationMetrics(
  _supabase: SupabaseClient,
  _dealId?: string
): Promise<CoordinationCriteria> {
  // Placeholder — requires more complex cross-workstream analysis
  return {
    cross_workstream_consistency: 0.80,
    deadline_tracking_accuracy: 0.90,
    escalation_appropriateness: 0.85,
  };
}

/**
 * Collect all system metrics.
 */
export async function collectAllMetrics(
  supabase: SupabaseClient,
  dealId?: string
): Promise<SystemMetrics> {
  const [accuracy, efficiency, quality, coverage, coordination] = await Promise.all([
    getAccuracyMetrics(supabase, dealId),
    getEfficiencyMetrics(supabase, dealId),
    getQualityMetrics(supabase, dealId),
    getCoverageMetrics(supabase, dealId),
    getCoordinationMetrics(supabase, dealId),
  ]);

  return {
    accuracy,
    efficiency,
    quality,
    coverage,
    coordination,
    collected_at: new Date().toISOString(),
  };
}

/**
 * Check metrics against thresholds and identify issues.
 */
export function identifyIssues(metrics: SystemMetrics): ObserverIssue[] {
  const issues: ObserverIssue[] = [];

  if (metrics.quality.tier2_modification_rate > THRESHOLDS.tier2_modification_rate) {
    issues.push({
      category: 'quality',
      severity: 'high',
      metric_name: 'tier2_modification_rate',
      current_value: metrics.quality.tier2_modification_rate,
      threshold: THRESHOLDS.tier2_modification_rate,
      description: `Tier 2 modification rate (${(metrics.quality.tier2_modification_rate * 100).toFixed(0)}%) exceeds threshold (${(THRESHOLDS.tier2_modification_rate * 100).toFixed(0)}%). Most modified type: ${metrics.quality.most_modified_action_type}`,
    });
  }

  if (metrics.quality.tier2_rejection_rate > THRESHOLDS.tier2_rejection_rate) {
    issues.push({
      category: 'quality',
      severity: 'critical',
      metric_name: 'tier2_rejection_rate',
      current_value: metrics.quality.tier2_rejection_rate,
      threshold: THRESHOLDS.tier2_rejection_rate,
      description: `Tier 2 rejection rate (${(metrics.quality.tier2_rejection_rate * 100).toFixed(0)}%) exceeds threshold`,
    });
  }

  if (metrics.efficiency.avg_cost_per_activation > THRESHOLDS.avg_cost_per_activation) {
    issues.push({
      category: 'efficiency',
      severity: 'medium',
      metric_name: 'avg_cost_per_activation',
      current_value: metrics.efficiency.avg_cost_per_activation,
      threshold: THRESHOLDS.avg_cost_per_activation,
      description: `Average cost per activation ($${metrics.efficiency.avg_cost_per_activation}) exceeds threshold`,
    });
  }

  if (metrics.coverage.consequence_map_coverage < THRESHOLDS.consequence_map_coverage) {
    issues.push({
      category: 'coverage',
      severity: 'medium',
      metric_name: 'consequence_map_coverage',
      current_value: metrics.coverage.consequence_map_coverage,
      threshold: THRESHOLDS.consequence_map_coverage,
      description: `Consequence map coverage (${(metrics.coverage.consequence_map_coverage * 100).toFixed(0)}%) below threshold. Unhandled: ${metrics.coverage.unhandled_event_types.join(', ')}`,
    });
  }

  return issues;
}
