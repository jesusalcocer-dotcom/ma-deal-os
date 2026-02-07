import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { encodeConstitution } from '@ma-deal-os/ai';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required and must be a string' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Load existing constitution for context
    const { data: deal } = await db
      .from('deals')
      .select('id, constitution')
      .eq('id', dealId)
      .single();

    const existingConstitution = deal?.constitution || null;

    const result = await encodeConstitution(message, existingConstitution);

    return NextResponse.json({
      delta: result.delta,
      metadata: result.metadata,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to encode constitution' },
      { status: 500 }
    );
  }
}
