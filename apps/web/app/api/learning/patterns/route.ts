import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/patterns — list learned patterns with filtering
 * Params: lifecycle_stage, agent_type, pattern_type, min_confidence, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lifecycleStage = searchParams.get('lifecycle_stage');
    const agentType = searchParams.get('agent_type');
    const patternType = searchParams.get('pattern_type');
    const minConfidence = parseFloat(searchParams.get('min_confidence') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('learned_patterns')
      .select('*', { count: 'exact' })
      .order('confidence', { ascending: false })
      .limit(limit);

    if (lifecycleStage) query = query.eq('lifecycle_stage', lifecycleStage);
    if (agentType) query = query.eq('agent_type', agentType);
    if (patternType) query = query.eq('pattern_type', patternType);
    if (minConfidence > 0) query = query.gte('confidence', minConfidence);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ patterns: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch patterns';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/learning/patterns — update a pattern (manual edit / human review)
 * Body: { id, lifecycle_stage?, confidence?, instruction?, description? }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Pattern id is required' }, { status: 400 });
    }

    // Allow-list of updatable fields
    const allowedFields = ['lifecycle_stage', 'confidence', 'instruction', 'description', 'conditions'];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    filtered.updated_at = new Date().toISOString();

    const db = supabase();

    // Get current state for audit
    const { data: before } = await db
      .from('learned_patterns')
      .select('lifecycle_stage, confidence, instruction')
      .eq('id', id)
      .single();

    const { data, error } = await db
      .from('learned_patterns')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await db.from('learning_audit_log').insert({
      action: 'pattern_manually_updated',
      component: 'patterns_api',
      details: {
        patternId: id,
        beforeState: before,
        afterState: filtered,
      },
    });

    return NextResponse.json({ pattern: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update pattern';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
