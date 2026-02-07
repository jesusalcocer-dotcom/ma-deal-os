import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/distillation/status — overall distillation status per task type
 * Returns: routing config with exemplar counts, trial stats, and current status.
 */
export async function GET() {
  try {
    const db = supabase();

    // Get all routing configs
    const { data: configs, error: configError } = await db
      .from('model_routing_config')
      .select('*')
      .order('task_type');

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    // Get trial counts per task type
    const { data: trials } = await db
      .from('distillation_trials')
      .select('task_type, trial_status');

    // Aggregate trial stats
    const trialStats: Record<string, { total: number; passed: number; failed: number; shadow: number; spotChecks: number }> = {};
    if (trials) {
      for (const trial of trials) {
        const tt = trial.task_type as string;
        if (!trialStats[tt]) {
          trialStats[tt] = { total: 0, passed: 0, failed: 0, shadow: 0, spotChecks: 0 };
        }
        trialStats[tt].total++;
        if (trial.trial_status === 'completed') trialStats[tt].passed++;
        if (trial.trial_status === 'shadow_test') trialStats[tt].shadow++;
        if (String(trial.trial_status).startsWith('spot_check')) trialStats[tt].spotChecks++;
      }
    }

    // Get recent evaluation averages per task type
    const { data: evaluations } = await db
      .from('self_evaluations')
      .select('agent_type, overall_score, model_used')
      .order('created_at', { ascending: false })
      .limit(200);

    const evalStats: Record<string, { avgScore: number; count: number; opusAvg: number; opusCount: number; sonnetAvg: number; sonnetCount: number }> = {};
    if (evaluations) {
      for (const ev of evaluations) {
        const at = ev.agent_type as string;
        const score = Number(ev.overall_score) || 0;
        const model = String(ev.model_used || '');
        if (!evalStats[at]) {
          evalStats[at] = { avgScore: 0, count: 0, opusAvg: 0, opusCount: 0, sonnetAvg: 0, sonnetCount: 0 };
        }
        evalStats[at].avgScore += score;
        evalStats[at].count++;
        if (model.includes('opus')) {
          evalStats[at].opusAvg += score;
          evalStats[at].opusCount++;
        } else {
          evalStats[at].sonnetAvg += score;
          evalStats[at].sonnetCount++;
        }
      }
      // Compute averages
      for (const key of Object.keys(evalStats)) {
        const s = evalStats[key];
        if (s.count > 0) s.avgScore = s.avgScore / s.count;
        if (s.opusCount > 0) s.opusAvg = s.opusAvg / s.opusCount;
        if (s.sonnetCount > 0) s.sonnetAvg = s.sonnetAvg / s.sonnetCount;
      }
    }

    // Build response
    const status = (configs || []).map((config: Record<string, unknown>) => ({
      taskType: config.task_type,
      currentModel: config.current_model,
      distillationStatus: config.distillation_status,
      exemplarCount: config.exemplar_count,
      minExemplarsForTesting: config.min_exemplars_for_testing,
      handoffThreshold: config.handoff_threshold,
      revertThreshold: config.revert_threshold,
      trials: trialStats[config.task_type as string] || { total: 0, passed: 0, failed: 0, shadow: 0, spotChecks: 0 },
      evaluations: evalStats[config.task_type as string] || null,
    }));

    return NextResponse.json({ distillation: status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch distillation status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
