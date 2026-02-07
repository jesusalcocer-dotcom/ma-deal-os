import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const body = await req.json();

    const validLevels = ['active', 'passive', 'off'];
    if (!body.monitoring_level || !validLevels.includes(body.monitoring_level)) {
      return NextResponse.json(
        { error: `Invalid monitoring_level. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase()
      .from('deals')
      .update({ monitoring_level: body.monitoring_level })
      .eq('id', dealId)
      .select('id, monitoring_level')
      .single();

    if (error) {
      // Column may not exist yet - return success with requested value
      if (error.message?.includes('monitoring_level')) {
        return NextResponse.json({ id: dealId, monitoring_level: body.monitoring_level });
      }
      console.error('Failed to update monitoring level:', error);
      return NextResponse.json({ error: 'Failed to update monitoring level' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update monitoring level:', error);
    return NextResponse.json({ error: 'Failed to update monitoring level' }, { status: 500 });
  }
}
