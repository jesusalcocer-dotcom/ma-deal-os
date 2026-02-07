import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/routing — fetch all model routing configurations
 */
export async function GET() {
  try {
    const db = supabase();

    const { data, error } = await db
      .from('model_routing_config')
      .select('*')
      .order('task_type');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch model routing config' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/routing — update a single routing entry
 * Body: { task_type: string, current_model: 'sonnet' | 'opus', ...other fields }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { task_type, ...updates } = body;

    if (!task_type) {
      return NextResponse.json(
        { error: 'task_type is required' },
        { status: 400 }
      );
    }

    // Only allow updating safe fields
    const allowedFields = [
      'current_model',
      'distillation_status',
      'min_exemplars_for_testing',
      'handoff_threshold',
      'revert_threshold',
      'spot_check_frequency',
    ];

    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const db = supabase();

    const { data, error } = await db
      .from('model_routing_config')
      .update(safeUpdates)
      .eq('task_type', task_type)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update model routing config' },
      { status: 500 }
    );
  }
}
