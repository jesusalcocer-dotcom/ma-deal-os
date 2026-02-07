import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { generateBriefing } from '@ma-deal-os/ai';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const db = supabase();

    const briefing = await generateBriefing(db, dealId);

    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error('Briefing generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate briefing' },
      { status: 500 }
    );
  }
}
