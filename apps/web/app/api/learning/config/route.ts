import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/config — fetch all learning configuration entries
 */
export async function GET() {
  try {
    const db = supabase();

    const { data, error } = await db
      .from('learning_configuration')
      .select('*')
      .order('config_key');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch learning configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/learning/config — update a single configuration entry
 * Body: { config_key: string, config_value: object }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { config_key, config_value } = body;

    if (!config_key || config_value === undefined) {
      return NextResponse.json(
        { error: 'config_key and config_value are required' },
        { status: 400 }
      );
    }

    const db = supabase();

    const { data, error } = await db
      .from('learning_configuration')
      .upsert(
        {
          config_key,
          config_value,
          updated_by: 'api',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'config_key' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update learning configuration' },
      { status: 500 }
    );
  }
}
