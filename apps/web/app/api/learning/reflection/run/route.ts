import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * POST /api/learning/reflection/run — trigger a reflection run
 * Body: { trigger_type: 'manual' | 'nightly', deal_id? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trigger_type, deal_id } = body;

    if (!trigger_type || !['manual', 'nightly', 'milestone'].includes(trigger_type)) {
      return NextResponse.json(
        { error: 'trigger_type (manual|nightly|milestone) is required' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Check if reflection is enabled
    const { data: config } = await db
      .from('learning_configuration')
      .select('config_value')
      .eq('config_key', 'learning.reflection.enabled')
      .single();

    const enabled = (config?.config_value as Record<string, unknown>)?.enabled !== false;
    if (!enabled) {
      return NextResponse.json(
        { error: 'Reflection engine is disabled. Enable via learning configuration.' },
        { status: 403 }
      );
    }

    // Dynamic import to avoid bundling AI package in all routes
    const { ReflectionEngine } = await import('@ma-deal-os/ai');
    const engine = new ReflectionEngine(db);

    const result = await engine.reflect({
      triggerType: trigger_type,
      dealId: deal_id || undefined,
    });

    return NextResponse.json({ reflection: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reflection run failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
