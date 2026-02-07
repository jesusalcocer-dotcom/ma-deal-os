import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { searchPrecedent } from '@ma-deal-os/integrations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      provision_type,
      query_text,
      min_quality = 0.30,
      max_results = 10,
      deal_size_range,
      industry,
    } = body;

    const db = supabase();

    const results = await searchPrecedent(db, {
      provision_type,
      query_text,
      min_quality,
      max_results,
      deal_size_range,
      industry,
    });

    return NextResponse.json({
      results,
      count: results.length,
      params: { provision_type, min_quality, max_results },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to search precedent' },
      { status: 500 }
    );
  }
}
