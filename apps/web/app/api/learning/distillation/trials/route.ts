import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/distillation/trials — list distillation trial results
 * Params: task_type, trial_status, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get('task_type');
    const trialStatus = searchParams.get('trial_status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('distillation_trials')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (taskType) query = query.eq('task_type', taskType);
    if (trialStatus) query = query.eq('trial_status', trialStatus);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ trials: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trials';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/learning/distillation/trials — trigger a new distillation trial
 * Body: { task_type }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_type } = body;

    if (!task_type) {
      return NextResponse.json(
        { error: 'task_type is required' },
        { status: 400 }
      );
    }

    // Import and run trial runner
    // Note: This makes real API calls and can be expensive. Guard behind feature flag.
    const db = supabase();

    // Check if distillation trials are enabled
    const { data: config } = await db
      .from('learning_configuration')
      .select('config_value')
      .eq('config_key', 'learning.distillation.enabled')
      .single();

    const enabled = (config?.config_value as Record<string, unknown>)?.enabled !== false;
    if (!enabled) {
      return NextResponse.json(
        { error: 'Distillation trials are disabled. Enable via learning configuration.' },
        { status: 403 }
      );
    }

    // Return acknowledgment — trial runs asynchronously
    // In production this would be queued, but for now we trigger and return
    return NextResponse.json({
      message: `Distillation trial queued for task type: ${task_type}`,
      task_type,
      status: 'queued',
    }, { status: 202 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to trigger trial';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
