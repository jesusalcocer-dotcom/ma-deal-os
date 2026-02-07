import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const db = supabase();

    const { data: deal, error } = await db
      .from('deals')
      .select('id, constitution')
      .eq('id', dealId)
      .single();

    if (error) {
      if (error.message?.includes('constitution')) {
        return NextResponse.json(null);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(deal?.constitution || null);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get constitution' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const body = await request.json();
    const db = supabase();

    // Validate structure
    if (
      !body ||
      !Array.isArray(body.hard_constraints) ||
      !Array.isArray(body.preferences) ||
      !Array.isArray(body.strategic_directives)
    ) {
      return NextResponse.json(
        {
          error:
            'Constitution must have hard_constraints, preferences, and strategic_directives arrays',
        },
        { status: 400 }
      );
    }

    const { error } = await db
      .from('deals')
      .update({ constitution: body })
      .eq('id', dealId);

    if (error) {
      if (error.message?.includes('constitution')) {
        return NextResponse.json(
          { error: 'constitution column not yet created — run migration 014' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, constitution: body });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update constitution' },
      { status: 500 }
    );
  }
}
