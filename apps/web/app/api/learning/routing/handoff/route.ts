import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * POST /api/learning/routing/handoff — approve or reject a model handoff
 * Body: { task_type, action: 'approve' | 'reject', reason? }
 *
 * Approve: sets current_model to 'sonnet', distillation_status to 'handed_off'
 * Reject: sets distillation_status back to 'collecting'
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task_type, action, reason } = body;

    if (!task_type || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'task_type and action (approve|reject) are required' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Get current config
    const { data: config, error: fetchError } = await db
      .from('model_routing_config')
      .select('*')
      .eq('task_type', task_type)
      .single();

    if (fetchError || !config) {
      return NextResponse.json(
        { error: `No routing config found for task type: ${task_type}` },
        { status: 404 }
      );
    }

    const previousModel = config.current_model;
    const previousStatus = config.distillation_status;

    if (action === 'approve') {
      // Update to handed off
      const { error: updateError } = await db
        .from('model_routing_config')
        .update({
          current_model: 'sonnet',
          distillation_status: 'handed_off',
          updated_at: new Date().toISOString(),
        })
        .eq('task_type', task_type);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Audit log
      await db.from('learning_audit_log').insert({
        action: 'handoff_approved',
        component: 'routing_handoff',
        details: {
          task_type,
          previous_model: previousModel,
          new_model: 'sonnet',
          previous_status: previousStatus,
          reason: reason || 'Manual approval',
        },
      });

      return NextResponse.json({
        message: `Handoff approved: ${task_type} now using Sonnet`,
        task_type,
        current_model: 'sonnet',
        distillation_status: 'handed_off',
      });
    } else {
      // Reject — revert to collecting
      const { error: updateError } = await db
        .from('model_routing_config')
        .update({
          distillation_status: 'collecting',
          updated_at: new Date().toISOString(),
        })
        .eq('task_type', task_type);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Audit log
      await db.from('learning_audit_log').insert({
        action: 'handoff_rejected',
        component: 'routing_handoff',
        details: {
          task_type,
          previous_status: previousStatus,
          reason: reason || 'Manual rejection',
        },
      });

      return NextResponse.json({
        message: `Handoff rejected: ${task_type} reverted to collecting`,
        task_type,
        distillation_status: 'collecting',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process handoff';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
