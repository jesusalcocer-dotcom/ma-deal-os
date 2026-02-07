import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { analyzeWhatsMarket } from '@ma-deal-os/ai';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provisionType = searchParams.get('provision_type');

    if (!provisionType) {
      return NextResponse.json(
        { error: 'provision_type query parameter is required' },
        { status: 400 }
      );
    }

    const db = supabase();

    // Look up provision type ID
    const { data: typeData } = await db
      .from('provision_types')
      .select('id')
      .eq('code', provisionType)
      .single();

    if (!typeData) {
      return NextResponse.json(
        { error: `Provision type '${provisionType}' not found` },
        { status: 404 }
      );
    }

    // Fetch formulations for this type
    const { data: formulations, error } = await db
      .from('provision_formulations')
      .select('text, year, deal_size_range, source_firm, composite_quality_score')
      .eq('provision_type_id', typeData.id)
      .order('composite_quality_score', { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) {
      // Fallback if quality columns don't exist
      const { data: fallback } = await db
        .from('provision_formulations')
        .select('text, year, deal_size_range, source_firm')
        .eq('provision_type_id', typeData.id)
        .limit(20);

      if (!fallback || fallback.length === 0) {
        return NextResponse.json({
          provision_type: provisionType,
          sample_size: 0,
          summary: 'No precedent data available for this provision type.',
          statistics: { most_common_variant: 'N/A', typical_values: 'N/A', trend: 'N/A' },
        });
      }

      const result = await analyzeWhatsMarket({
        provision_type: provisionType,
        formulations: fallback.map((f: any) => ({
          ...f,
          composite_quality_score: null,
        })),
      });
      return NextResponse.json(result);
    }

    if (!formulations || formulations.length === 0) {
      return NextResponse.json({
        provision_type: provisionType,
        sample_size: 0,
        summary: 'No precedent data available for this provision type.',
        statistics: { most_common_variant: 'N/A', typical_values: 'N/A', trend: 'N/A' },
      });
    }

    const result = await analyzeWhatsMarket({
      provision_type: provisionType,
      formulations,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to analyze market data' },
      { status: 500 }
    );
  }
}
