/**
 * Simulation Report Generator
 * Generates comprehensive evaluation reports after simulation runs.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SimulationReport } from '@ma-deal-os/core';
import { collectAllMetrics } from './metrics-collector';

/**
 * Generate a detailed simulation evaluation report.
 */
export async function generateSimulationReport(
  supabase: SupabaseClient,
  simulationId: string,
  baseReport: SimulationReport
): Promise<SimulationReport> {
  // Enrich with actual metrics from the database if available
  try {
    const buyerMetrics = await collectAllMetrics(supabase, baseReport.simulationId);

    // Compute actual scores from metrics
    const scores = {
      accuracy: computeAccuracyScore(buyerMetrics),
      efficiency: computeEfficiencyScore(buyerMetrics),
      quality: computeQualityScore(buyerMetrics),
      coverage: computeCoverageScore(buyerMetrics),
      coordination: computeCoordinationScore(buyerMetrics),
      overall: 0,
    };
    scores.overall = (
      scores.accuracy * 0.25 +
      scores.efficiency * 0.15 +
      scores.quality * 0.30 +
      scores.coverage * 0.15 +
      scores.coordination * 0.15
    );

    return {
      ...baseReport,
      scores,
    };
  } catch {
    // If metrics collection fails, return base report
    return baseReport;
  }
}

function computeAccuracyScore(metrics: any): number {
  const { accuracy } = metrics;
  return (
    accuracy.document_version_accuracy * 0.3 +
    accuracy.checklist_completeness * 0.3 +
    accuracy.dd_finding_precision * 0.2 +
    (accuracy.provision_classification_accuracy || 0.8) * 0.2
  );
}

function computeEfficiencyScore(metrics: any): number {
  const { efficiency } = metrics;
  // Score based on cost per activation (lower is better)
  if (efficiency.total_activations === 0) return 0.5;
  const costScore = Math.max(0, 1 - efficiency.avg_cost_per_activation / 2.0);
  return Math.min(1, costScore);
}

function computeQualityScore(metrics: any): number {
  const { quality } = metrics;
  // Lower modification and rejection rates = higher quality
  const modScore = Math.max(0, 1 - quality.tier2_modification_rate * 2);
  const rejScore = Math.max(0, 1 - quality.tier2_rejection_rate * 5);
  return (modScore * 0.6 + rejScore * 0.4);
}

function computeCoverageScore(metrics: any): number {
  return metrics.coverage.consequence_map_coverage;
}

function computeCoordinationScore(metrics: any): number {
  const { coordination } = metrics;
  return (
    coordination.cross_workstream_consistency * 0.4 +
    coordination.deadline_tracking_accuracy * 0.3 +
    coordination.escalation_appropriateness * 0.3
  );
}
