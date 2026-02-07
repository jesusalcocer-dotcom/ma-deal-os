/**
 * Observer Agent
 * Monitors system performance, diagnoses issues, and prescribes improvements.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { callClaude } from '../../client';
import { collectAllMetrics, identifyIssues } from './metrics-collector';
import { buildObserverPrompt } from './system-prompt';
import type { SystemMetrics, ObserverIssue } from './evaluation-criteria';

export interface ObserverDiagnosis {
  category: string;
  severity: string;
  diagnosis: string;
  prescribed_fix: {
    type: string;
    target: string;
    description: string;
    confidence: string;
  };
}

export interface ObserverResult {
  metrics: SystemMetrics;
  threshold_violations: ObserverIssue[];
  diagnoses: ObserverDiagnosis[];
  summary: string;
  recommendations: string[];
  metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
  };
}

/**
 * Run the Observer Agent to analyze system health and prescribe improvements.
 */
export async function activateObserver(
  supabase: SupabaseClient,
  options?: { dealId?: string; dryRun?: boolean }
): Promise<ObserverResult> {
  const dealId = options?.dealId;

  // Step 1: Collect metrics
  const metrics = await collectAllMetrics(supabase, dealId);

  // Step 2: Identify threshold violations
  const issues = identifyIssues(metrics);

  // Step 3: If no issues, return clean bill of health
  if (issues.length === 0) {
    return {
      metrics,
      threshold_violations: [],
      diagnoses: [],
      summary: 'All system metrics within acceptable range. No improvements needed.',
      recommendations: [],
      metadata: { model: 'none', tokens_used: 0, cost_usd: 0 },
    };
  }

  // Step 4: Use Claude to diagnose and prescribe
  const systemPrompt = buildObserverPrompt(metrics, issues);

  const response = await callClaude(
    [
      {
        role: 'user',
        content: `Analyze the ${issues.length} threshold violation(s) above. For each, diagnose the root cause and prescribe a specific fix. Focus on the highest-severity issues first.`,
      },
    ],
    {
      system: systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2048,
    }
  );

  // Parse response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  let diagnoses: ObserverDiagnosis[] = [];
  let summary = 'Analysis complete.';
  let recommendations: string[] = [];

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      diagnoses = parsed.issues_found || [];
      summary = parsed.summary || summary;
      recommendations = parsed.recommendations || [];
    } catch {
      // If parsing fails, use raw response
      summary = response.substring(0, 500);
    }
  }

  // Step 5: Log to observer_changelog if not dry run
  if (!options?.dryRun && diagnoses.length > 0) {
    for (const diagnosis of diagnoses) {
      try {
        await supabase.from('observer_changelog').insert({
          change_type: diagnosis.prescribed_fix?.type || 'diagnosis',
          file_path: diagnosis.prescribed_fix?.target || null,
          description: diagnosis.diagnosis,
          prescribed_fix: diagnosis.prescribed_fix?.description || null,
          confidence: diagnosis.prescribed_fix?.confidence || 'medium',
          needs_human_review: diagnosis.severity === 'critical',
        });
      } catch {
        // Table may not exist yet
      }
    }
  }

  // Estimate cost (Sonnet: $3/$15 per M tokens)
  const estimatedTokens = response.length * 1.3;
  const costUsd = (estimatedTokens / 1_000_000) * 15;

  return {
    metrics,
    threshold_violations: issues,
    diagnoses,
    summary,
    recommendations,
    metadata: {
      model: 'claude-sonnet-4-5-20250929',
      tokens_used: Math.round(estimatedTokens),
      cost_usd: Math.round(costUsd * 10000) / 10000,
    },
  };
}
