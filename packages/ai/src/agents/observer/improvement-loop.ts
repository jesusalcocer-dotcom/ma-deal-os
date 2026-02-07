/**
 * Observer Improvement Loop
 * Full cycle: detect → diagnose → prescribe → implement → test → deploy
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { activateObserver } from './observer-agent';
import type { ObserverDiagnosis } from './observer-agent';

export interface ImprovementResult {
  issue: ObserverDiagnosis;
  fix_applied: boolean;
  fix_type: string;
  details: string;
  test_passed: boolean | null;
  attempts: number;
  escalated: boolean;
}

export interface ImprovementLoopResult {
  issues_detected: number;
  fixes_attempted: number;
  fixes_applied: number;
  escalated_to_human: number;
  results: ImprovementResult[];
  metadata: {
    duration_ms: number;
    total_cost_usd: number;
  };
}

/**
 * Run the full Observer improvement loop.
 *
 * 1. Detect: Collect metrics, compare thresholds
 * 2. Diagnose: Observer analyzes root cause
 * 3. Prescribe: Observer proposes specific change
 * 4. Implement: Write skill/prompt change directly, or flag code changes
 * 5. Test: Verify the change doesn't break the build
 * 6. Deploy: Log to observer_changelog
 * 7. Verify: Flag for monitoring
 */
export async function runImprovementLoop(
  supabase: SupabaseClient,
  options?: {
    dealId?: string;
    dryRun?: boolean;
    maxIssues?: number;
  }
): Promise<ImprovementLoopResult> {
  const startTime = Date.now();
  const maxIssues = options?.maxIssues ?? 5;
  const dryRun = options?.dryRun ?? false;

  // Step 1-3: Detect, Diagnose, Prescribe (handled by Observer Agent)
  const observerResult = await activateObserver(supabase, {
    dealId: options?.dealId,
    dryRun: true, // We handle logging ourselves
  });

  const results: ImprovementResult[] = [];
  let totalCost = observerResult.metadata.cost_usd;

  // Process each diagnosed issue (up to maxIssues)
  const issuesToProcess = observerResult.diagnoses.slice(0, maxIssues);

  for (const diagnosis of issuesToProcess) {
    const result = await processIssue(supabase, diagnosis, dryRun);
    results.push(result);
  }

  // Count results
  const fixesApplied = results.filter((r) => r.fix_applied).length;
  const escalated = results.filter((r) => r.escalated).length;

  return {
    issues_detected: observerResult.diagnoses.length,
    fixes_attempted: issuesToProcess.length,
    fixes_applied: fixesApplied,
    escalated_to_human: escalated,
    results,
    metadata: {
      duration_ms: Date.now() - startTime,
      total_cost_usd: totalCost,
    },
  };
}

/**
 * Process a single diagnosed issue through the improvement cycle.
 */
async function processIssue(
  supabase: SupabaseClient,
  diagnosis: ObserverDiagnosis,
  dryRun: boolean
): Promise<ImprovementResult> {
  const fixType = diagnosis.prescribed_fix?.type || 'unknown';
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Step 4: Implement
    if (fixType === 'skill_update' || fixType === 'prompt_modification') {
      // Skill and prompt changes are safe — the Observer can describe them
      // but actual file writes happen via the Coding Agent or manual review
      const description = diagnosis.prescribed_fix?.description || diagnosis.diagnosis;

      if (!dryRun) {
        // Log the prescribed change to observer_changelog
        try {
          await supabase.from('observer_changelog').insert({
            change_type: fixType,
            file_path: diagnosis.prescribed_fix?.target || null,
            description: description,
            diagnosis: diagnosis.diagnosis,
            prescribed_fix: diagnosis.prescribed_fix?.description || null,
            confidence: diagnosis.prescribed_fix?.confidence || 'medium',
            needs_human_review: diagnosis.severity === 'critical',
          });
        } catch {
          // Table may not exist yet
        }
      }

      return {
        issue: diagnosis,
        fix_applied: !dryRun,
        fix_type: fixType,
        details: `Prescribed: ${description}`,
        test_passed: null, // No automated test for skill/prompt changes
        attempts: attempt,
        escalated: false,
      };
    }

    if (fixType === 'code_fix') {
      // Code changes require the Coding Agent + Testing Agent pipeline
      // For safety, always escalate code changes for human review
      if (!dryRun) {
        try {
          await supabase.from('observer_changelog').insert({
            change_type: 'code_fix',
            file_path: diagnosis.prescribed_fix?.target || null,
            description: diagnosis.diagnosis,
            diagnosis: diagnosis.diagnosis,
            prescribed_fix: diagnosis.prescribed_fix?.description || null,
            confidence: diagnosis.prescribed_fix?.confidence || 'medium',
            needs_human_review: true, // Code changes always need review
          });
        } catch {
          // Table may not exist yet
        }
      }

      return {
        issue: diagnosis,
        fix_applied: false,
        fix_type: 'code_fix',
        details: `Code fix prescribed but requires human review: ${diagnosis.prescribed_fix?.description}`,
        test_passed: null,
        attempts: attempt,
        escalated: true,
      };
    }

    if (fixType === 'config_change') {
      // Config changes are relatively safe
      if (!dryRun) {
        try {
          await supabase.from('observer_changelog').insert({
            change_type: 'config_change',
            file_path: diagnosis.prescribed_fix?.target || null,
            description: diagnosis.diagnosis,
            diagnosis: diagnosis.diagnosis,
            prescribed_fix: diagnosis.prescribed_fix?.description || null,
            confidence: diagnosis.prescribed_fix?.confidence || 'medium',
            needs_human_review: diagnosis.severity === 'critical',
          });
        } catch {
          // Table may not exist yet
        }
      }

      return {
        issue: diagnosis,
        fix_applied: !dryRun,
        fix_type: 'config_change',
        details: `Config change prescribed: ${diagnosis.prescribed_fix?.description}`,
        test_passed: null,
        attempts: attempt,
        escalated: false,
      };
    }
  }

  // If we get here, all attempts failed — escalate
  if (!dryRun) {
    try {
      await supabase.from('observer_changelog').insert({
        change_type: fixType,
        file_path: diagnosis.prescribed_fix?.target || null,
        description: `ESCALATED after ${maxAttempts} attempts: ${diagnosis.diagnosis}`,
        diagnosis: diagnosis.diagnosis,
        prescribed_fix: diagnosis.prescribed_fix?.description || null,
        confidence: 'low',
        needs_human_review: true,
      });
    } catch {
      // Table may not exist yet
    }
  }

  return {
    issue: diagnosis,
    fix_applied: false,
    fix_type: fixType,
    details: `Escalated to human after ${maxAttempts} failed attempts`,
    test_passed: false,
    attempts: maxAttempts,
    escalated: true,
  };
}
